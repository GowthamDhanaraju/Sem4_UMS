import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { verifyToken } from '../../../../lib/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // GET method - Fetch teacher's bookings
  if (req.method === 'GET') {
    try {
      // Verify teacher authorization
      const token = req.headers.authorization?.split(' ')[1];
      const decoded = verifyToken(token);
      
      if (!decoded || decoded.role !== 'TEACHER') {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // Find bookings requested by this teacher
      const bookings = await prisma.auditoriumBooking.findMany({
        where: {
          requestedBy: decoded.id
        },
        include: {
          auditorium: true
        },
        orderBy: {
          date: 'desc'
        }
      });
      
      const formattedBookings = bookings.map(booking => ({
        id: booking.id,
        title: booking.title,
        date: booking.date,
        timeSlot: booking.timeSlot,
        description: booking.description || '',
        status: booking.status,
        auditoriumName: booking.auditorium.name
      }));
      
      return res.status(200).json(formattedBookings);
    } catch (error) {
      console.error('Error fetching teacher bookings:', error);
      return res.status(500).json({ message: 'Failed to fetch bookings' });
    }
  }
  
  // POST method - Create a new booking request
  else if (req.method === 'POST') {
    try {
      // Verify teacher authorization
      const token = req.headers.authorization?.split(' ')[1];
      const decoded = verifyToken(token);
      
      if (!decoded || decoded.role !== 'TEACHER') {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const { title, date, time, description } = req.body;
      
      // Find teacher for faculty field
      const teacher = await prisma.teacher.findFirst({
        where: {
          userId: decoded.id
        },
        include: {
          user: true
        }
      });
      
      // Find an available auditorium
      const availableAuditorium = await prisma.auditorium.findFirst({
        where: {
          status: 'available'
        }
      });
      
      if (!availableAuditorium) {
        return res.status(400).json({ message: 'No auditoriums available for booking' });
      }
      
      const newBooking = await prisma.auditoriumBooking.create({
        data: {
          title,
          date: new Date(date),
          timeSlot: time,
          description,
          auditoriumId: availableAuditorium.id,
          status: 'pending',
          requestedBy: decoded.id,
          faculty: teacher?.user.name || 'Unknown'
        }
      });
      
      return res.status(201).json(newBooking);
    } catch (error) {
      console.error('Error creating booking request:', error);
      return res.status(500).json({ message: 'Failed to create booking request' });
    }
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
}
