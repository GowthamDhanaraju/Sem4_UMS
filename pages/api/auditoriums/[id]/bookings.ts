import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  const auditoriumId = String(id);

  // GET bookings for an auditorium
  if (req.method === 'GET') {
    try {
      const bookings = await prisma.booking.findMany({
        where: { auditoriumId },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      return res.status(200).json({ success: true, data: bookings });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to fetch bookings' });
    }
  }

  // POST create a new booking
  if (req.method === 'POST') {
    try {
      const { title, date, time, faculty, club, description, userId } = req.body;

      // Check if auditorium exists
      const auditorium = await prisma.auditorium.findUnique({
        where: { id: auditoriumId },
      });

      if (!auditorium) {
        return res.status(404).json({ error: 'Auditorium not found' });
      }

      // Check if the auditorium is available
      if (auditorium.status !== 'available') {
        return res.status(400).json({ 
          error: `Auditorium is currently ${auditorium.status}` 
        });
      }

      // Check for conflicting bookings
      const existingBooking = await prisma.booking.findFirst({
        where: {
          auditoriumId,
          date: new Date(date),
          time,
          status: { in: ['pending', 'approved'] },
        },
      });

      if (existingBooking) {
        return res.status(400).json({ 
          error: 'This time slot is already booked' 
        });
      }

      const booking = await prisma.booking.create({
        data: {
          title,
          date: new Date(date),
          time,
          faculty,
          club,
          description,
          status: 'pending',
          auditoriumId,
          userId,
        },
      });

      return res.status(201).json({ success: true, data: booking });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to create booking' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
