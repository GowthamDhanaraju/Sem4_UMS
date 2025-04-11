import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { connectToDatabase } from '../../../utils/db';
import { verifyToken } from '../../../utils/auth';
import { ObjectId } from 'mongodb';

// Validation schema for creating a booking
const createBookingSchema = z.object({
  auditoriumId: z.string(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  purpose: z.string(),
  attendees: z.number().min(1),
  requirements: z.array(z.string()).optional(),
  additionalNotes: z.string().optional()
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

    const { db } = await connectToDatabase();
    
    // GET - List bookings
    if (req.method === 'GET') {
      const { 
        auditoriumId, 
        date, 
        status = 'all', 
        userId,
        startDate,
        endDate,
        page = '1', 
        limit = '20' 
      } = req.query;
      
      const query: any = {};
      
      if (auditoriumId) {
        try {
          query.auditoriumId = new ObjectId(auditoriumId as string);
        } catch (error) {
          return res.status(400).json({ success: false, message: 'Invalid auditorium ID format' });
        }
      }
      
      if (date) {
        query.date = date;
      }
      
      if (startDate && endDate) {
        query.date = { $gte: startDate, $lte: endDate };
      }
      
      if (status !== 'all') {
        query.status = status;
      }
      
      // If not admin, restrict what users can see
      if (user.role !== 'admin') {
        // Teachers and students can only see their own bookings or approved ones
        if (userId === 'me' || !userId) {
          query.$or = [
            { requesterId: new ObjectId(user.id) },
            { status: 'approved' }
          ];
        } else if (user.role === 'teacher') {
          // Teachers can see their department's bookings
          const teacher = await db.collection('users').findOne({ _id: new ObjectId(user.id) });
          if (teacher && teacher.departmentId) {
            query.$or = [
              { requesterId: new ObjectId(user.id) },
              { 
                requesterDepartmentId: teacher.departmentId,
                status: { $in: ['pending', 'approved'] }
              },
              { status: 'approved' }
            ];
          } else {
            query.$or = [
              { requesterId: new ObjectId(user.id) },
              { status: 'approved' }
            ];
          }
        }
      } else if (userId && userId !== 'all') {
        // Admin filtering by user
        try {
          query.requesterId = new ObjectId(userId as string);
        } catch (error) {
          return res.status(400).json({ success: false, message: 'Invalid user ID format' });
        }
      }
      
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;
      
      const bookings = await db.collection('auditorium_bookings')
        .find(query)
        .sort({ date: 1, startTime: 1 })
        .skip(skip)
        .limit(limitNum)
        .toArray();
      
      // Populate requester and auditorium data
      const populatedBookings = await Promise.all(bookings.map(async (booking) => {
        const [requester, auditorium] = await Promise.all([
          db.collection('users').findOne(
            { _id: booking.requesterId },
            { projection: { name: 1, email: 1, role: 1, departmentId: 1 } }
          ),
          db.collection('auditoriums').findOne(
            { _id: booking.auditoriumId },
            { projection: { name: 1, location: 1, capacity: 1 } }
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
        
        return {
          ...booking,
          requester: requester ? { ...requester, department } : null,
          auditorium
        };
      }));
      
      const total = await db.collection('auditorium_bookings').countDocuments(query);
      
      return res.status(200).json({
        success: true,
        data: populatedBookings,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum)
        }
      });
    }

    // POST - Create new booking request
    if (req.method === 'POST') {
      try {
        const validatedData = createBookingSchema.parse(req.body);
        
        let auditoriumId;
        try {
          auditoriumId = new ObjectId(validatedData.auditoriumId);
        } catch (error) {
          return res.status(400).json({ success: false, message: 'Invalid auditorium ID format' });
        }
        
        // Check if auditorium exists and is available
        const auditorium = await db.collection('auditoriums').findOne({
          _id: auditoriumId
        });
        
        if (!auditorium) {
          return res.status(404).json({
            success: false,
            message: 'Auditorium not found'
          });
        }
        
        if (auditorium.status !== 'available') {
          return res.status(400).json({
            success: false,
            message: `Auditorium is currently ${auditorium.status}`
          });
        }
        
        // Check if there are any conflicting bookings
        const existingBooking = await db.collection('auditorium_bookings').findOne({
          auditoriumId,
          date: validatedData.date,
          status: 'approved',
          $or: [
            {
              // New booking starts during an existing booking
              startTime: { $lte: validatedData.startTime },
              endTime: { $gt: validatedData.startTime }
            },
            {
              // New booking ends during an existing booking
              startTime: { $lt: validatedData.endTime },
              endTime: { $gte: validatedData.endTime }
            },
            {
              // New booking completely encompasses an existing booking
              startTime: { $gte: validatedData.startTime },
              endTime: { $lte: validatedData.endTime }
            }
          ]
        });
        
        if (existingBooking) {
          return res.status(400).json({
            success: false,
            message: 'Time slot is already booked'
          });
        }
        
        // Get user department if available
        const requester = await db.collection('users').findOne({ _id: new ObjectId(user.id) });
        let requesterDepartmentId = null;
        if (requester && requester.departmentId) {
          requesterDepartmentId = new ObjectId(requester.departmentId);
        }
        
        // Set booking status based on role
        // Admins get auto-approval, others go to pending
        const status = user.role === 'admin' ? 'approved' : 'pending';
        
        const newBooking = {
          ...validatedData,
          auditoriumId,
          requesterId: new ObjectId(user.id),
          requesterDepartmentId,
          status,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        const result = await db.collection('auditorium_bookings').insertOne(newBooking);
        
        return res.status(201).json({
          success: true,
          message: status === 'approved' 
            ? 'Auditorium booked successfully' 
            : 'Booking request submitted for approval',
          data: {
            _id: result.insertedId,
            ...newBooking
          }
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

    // Method not allowed
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  } catch (error) {
    console.error('Auditorium booking error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}
