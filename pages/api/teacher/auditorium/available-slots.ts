import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { verifyToken } from '../../../../lib/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Verify teacher authorization
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = verifyToken(token);
    
    if (!decoded || decoded.role !== 'TEACHER') {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Find available auditoriums
    const availableAuditoriums = await prisma.auditorium.findMany({
      where: {
        status: 'available'
      }
    });
    
    if (availableAuditoriums.length === 0) {
      return res.status(200).json([]);
    }
    
    // Get all existing bookings for the next two weeks
    const twoWeeksFromNow = new Date();
    twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);
    
    const existingBookings = await prisma.auditoriumBooking.findMany({
      where: {
        date: {
          gte: new Date(),
          lte: twoWeeksFromNow
        },
        status: {
          in: ['approved', 'pending']
        }
      }
    });
    
    // Generate all possible time slots for the next two weeks
    const timeSlots = ['9:00 AM - 11:00 AM', '11:00 AM - 1:00 PM', '2:00 PM - 4:00 PM', '4:00 PM - 6:00 PM'];
    const availableSlots = [];
    
    const currentDate = new Date();
    const endDate = new Date(twoWeeksFromNow);
    
    while (currentDate <= endDate) {
      // Skip weekends (Saturday and Sunday)
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
        for (const timeSlot of timeSlots) {
          const dateString = currentDate.toISOString().split('T')[0];
          
          // Check if this slot is already booked
          const isBooked = existingBookings.some(booking => 
            booking.date.toISOString().split('T')[0] === dateString && 
            booking.timeSlot === timeSlot
          );
          
          if (!isBooked) {
            availableSlots.push({
              id: `${dateString}-${timeSlot}`,
              date: dateString,
              timeSlot: timeSlot
            });
          }
        }
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return res.status(200).json(availableSlots);
  } catch (error) {
    console.error('Error fetching available slots:', error);
    return res.status(500).json({ message: 'Failed to fetch available slots' });
  }
}
