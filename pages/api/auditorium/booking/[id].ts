import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { connectToDatabase } from '../../../../utils/db';
import { verifyToken } from '../../../../utils/auth';
import { ObjectId } from 'mongodb';

// Validation schema for updating a booking
const updateBookingSchema = z.object({
  date: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  purpose: z.string().optional(),
  attendees: z.number().min(1).optional(),
  requirements: z.array(z.string()).optional(),
  additionalNotes: z.string().optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']).optional(),
  adminRemarks: z.string().optional()
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Verify authentication
    const user = await verifyToken(req);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid booking ID' });
    }

    let bookingId;
    try {
      bookingId = new ObjectId(id);
    } catch (error) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID format' });
    }

    const { db } = await connectToDatabase();
    
    // Find the booking
    const booking = await db.collection('auditorium_bookings').findOne({ _id: bookingId });
    
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    
    // Check permissions
    const isAdmin = user.role === 'admin';
    const isOwner = booking.requesterId.toString() === user.id;
    
    // GET - Get booking details
    if (req.method === 'GET') {
      // Students can only view their own bookings or approved ones
      if (user.role === 'student' && !isOwner && booking.status !== 'approved') {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
      
      // Populate requester and auditorium data
      const [requester, auditorium] = await Promise.all([
        db.collection('users').findOne(
          { _id: booking.requesterId },
          { projection: { name: 1, email: 1, role: 1, departmentId: 1 } }
        ),
        db.collection('auditoriums').findOne(
          { _id: booking.auditoriumId },
          { projection: { name: 1, location: 1, capacity: 1, amenities: 1 } }
        )
      ]);
      
      // Get department info if available
      let department = null;
      if (requester && requester.departmentId) {
        department = await db.collection('departments').findOne(
          { _id: new ObjectId(requester.departmentId) },
          { projection: { name: 1, code: 1 } }
        );
      }
      
      const populatedBooking = {
        ...booking,
        requester: requester ? { ...requester, department } : null,
        auditorium
      };
      
      return res.status(200).json({
        success: true,
        data: populatedBooking
      });
    }
    
    // PUT - Update booking
    if (req.method === 'PUT') {
      try {
        const validatedData = updateBookingSchema.parse(req.body);
        
        // Check permissions for status changes
        if (validatedData.status) {
          // Only admins can approve/reject
          if ((validatedData.status === 'approved' || validatedData.status === 'rejected') && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Only administrators can approve or reject bookings' });
          }
          
          // Anyone can cancel their own booking
          if (validatedData.status === 'cancelled' && !isAdmin && !isOwner) {
            return res.status(403).json({ success: false, message: 'You can only cancel your own bookings' });
          }
        }
        
        // For schedule changes, check time conflicts
        if ((validatedData.date || validatedData.startTime || validatedData.endTime) && 
            (isAdmin || (isOwner && booking.status === 'pending'))) {
          
          const newDate = validatedData.date || booking.date;
          const newStartTime = validatedData.startTime || booking.startTime;
          const newEndTime = validatedData.endTime || booking.endTime;
          
          // Check for conflicts
          const conflictingBooking = await db.collection('auditorium_bookings').findOne({
            _id: { $ne: bookingId },
            auditoriumId: booking.auditoriumId,
            date: newDate,
            status: 'approved',
            $or: [
              {
                startTime: { $lte: newStartTime },
                endTime: { $gt: newStartTime }
              },
              {
                startTime: { $lt: newEndTime },
                endTime: { $gte: newEndTime }
              },
              {
                startTime: { $gte: newStartTime },
                endTime: { $lte: newEndTime }
              }
            ]
          });
          
          if (conflictingBooking) {
            return res.status(400).json({
              success: false,
              message: 'The requested time slot conflicts with an existing booking'
            });
          }
        } else if ((validatedData.date || validatedData.startTime || validatedData.endTime) && 
                  isOwner && booking.status === 'approved') {
          // Cannot change schedule of approved bookings unless admin
          return res.status(400).json({
            success: false,
            message: 'Cannot modify the schedule of an approved booking. Please cancel and create a new request.'
          });
        }
        
        // Non-admins can only update their own pending bookings
        if (!isAdmin && (!isOwner || booking.status !== 'pending')) {
          // Allow cancellation by owner even if approved
          if (isOwner && validatedData.status === 'cancelled') {
            // Only allow status change to cancelled
            validatedData = { status: 'cancelled' };
          } else {
            return res.status(403).json({ 
              success: false, 
              message: 'You can only update your own pending bookings' 
            });
          }
        }
        
        // Set updated timestamp and user
        const updateData = {
          ...validatedData,
          updatedAt: new Date(),
          updatedBy: new ObjectId(user.id)
        };
        
        // If admin is approving, set approval info
        if (isAdmin && validatedData.status === 'approved') {
          updateData.approvedAt = new Date();
          updateData.approvedBy = new ObjectId(user.id);
        }
        
        // If admin is rejecting, make sure there are remarks
        if (isAdmin && validatedData.status === 'rejected' && !validatedData.adminRemarks) {
          return res.status(400).json({
            success: false,
            message: 'Admin remarks are required when rejecting a booking'
          });
        }
        
        const result = await db.collection('auditorium_bookings').updateOne(
          { _id: bookingId },
          { $set: updateData }
        );
        
        if (result.matchedCount === 0) {
          return res.status(404).json({
            success: false,
            message: 'Booking not found'
          });
        }
        
        const updatedBooking = await db.collection('auditorium_bookings').findOne({ _id: bookingId });
        
        return res.status(200).json({
          success: true,
          message: 'Booking updated successfully',
          data: updatedBooking
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: error.errors
          });
        }
        throw error;
      }
    }
    
    // DELETE - Delete booking
    if (req.method === 'DELETE') {
      // Only admins can delete any booking, users can only delete their pending bookings
      if (!isAdmin && (!isOwner || booking.status !== 'pending')) {
        return res.status(403).json({ 
          success: false, 
          message: 'You can only delete your own pending bookings' 
        });
      }
      
      const result = await db.collection('auditorium_bookings').deleteOne({ _id: bookingId });
      
      if (result.deletedCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Booking deleted successfully'
      });
    }

    // Method not allowed
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  } catch (error) {
    console.error('Booking error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}
