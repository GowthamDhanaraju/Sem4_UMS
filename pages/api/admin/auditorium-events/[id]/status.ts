import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../../lib/prisma';
import { verifyToken } from '../../../../../lib/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  const eventId = Array.isArray(id) ? id[0] : id;
  
  // PATCH - Update event status
  if (req.method === 'PATCH') {
    try {
      // Verify admin authorization - uncomment if you have auth implemented
      // const token = req.headers.authorization?.split(' ')[1];
      // const decoded = verifyToken(token);
      // 
      // if (!decoded || decoded.role !== 'ADMIN') {
      //   return res.status(401).json({ message: 'Unauthorized' });
      // }
      
      const { status } = req.body;
      
      const booking = await prisma.auditoriumBooking.findUnique({
        where: { id: eventId },
        include: { auditorium: true }
      });
      
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }
      
      // If approving the booking, check auditorium availability
      if (status === 'approved') {
        // Check if auditorium is available
        if (booking.auditorium.status !== 'available') {
          return res.status(400).json({ 
            message: `Cannot approve booking: Auditorium is currently ${booking.auditorium.status}` 
          });
        }
        
        // Check for other approved bookings in the same time slot
        const conflictingBooking = await prisma.auditoriumBooking.findFirst({
          where: {
            id: { not: eventId },
            auditoriumId: booking.auditoriumId,
            date: booking.date,
            timeSlot: booking.timeSlot,
            status: 'approved'
          }
        });
        
        if (conflictingBooking) {
          return res.status(400).json({ 
            message: 'Cannot approve: This time slot already has an approved booking' 
          });
        }
        
        // Update the availability slot
        await prisma.availabilitySlot.updateMany({
          where: {
            auditoriumId: booking.auditoriumId,
            date: booking.date,
            timeSlot: booking.timeSlot
          },
          data: {
            isAvailable: false
          }
        });
      }
      
      const updatedEvent = await prisma.auditoriumBooking.update({
        where: { id: eventId },
        data: { status }
      });
      
      return res.status(200).json(updatedEvent);
    } catch (error) {
      console.error('Error updating event status:', error);
      return res.status(500).json({ message: 'Failed to update status' });
    }
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
}
