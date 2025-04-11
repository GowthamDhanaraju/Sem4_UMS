import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // GET: List all bookings
  if (req.method === 'GET') {
    try {
      const { auditoriumId, userId, status, upcoming } = req.query;
      
      let whereClause: any = {};
      
      if (auditoriumId) whereClause.auditoriumId = String(auditoriumId);
      if (userId) whereClause.userId = String(userId);
      if (status) whereClause.status = String(status);
      if (upcoming === 'true') {
        whereClause.startTime = {
          gte: new Date()
        };
      }
      
      const bookings = await prisma.auditoriumBooking.findMany({
        where: whereClause,
        include: {
          auditorium: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          startTime: 'asc',
        },
      });

      return res.status(200).json({ success: true, data: bookings });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to fetch bookings' });
    }
  }

  // POST: Create a new booking
  if (req.method === 'POST') {
    try {
      const {
        auditoriumId,
        userId,
        title,
        description,
        startTime,
        endTime,
        attendees,
      } = req.body;

      // Validate required fields
      if (!auditoriumId || !userId || !title || !startTime || !endTime) {
        return res.status(400).json({
          error: 'Auditorium, user, title, start time and end time are required',
        });
      }

      // Check availability
      const conflictingBooking = await prisma.auditoriumBooking.findFirst({
        where: {
          auditoriumId,
          status: { in: ['approved', 'pending'] },
          OR: [
            {
              startTime: {
                lte: new Date(startTime),
              },
              endTime: {
                gt: new Date(startTime),
              },
            },
            {
              startTime: {
                lt: new Date(endTime),
              },
              endTime: {
                gte: new Date(endTime),
              },
            },
            {
              startTime: {
                gte: new Date(startTime),
              },
              endTime: {
                lte: new Date(endTime),
              },
            },
          ],
        },
      });

      if (conflictingBooking) {
        return res.status(409).json({
          error: 'Auditorium is already booked during this time period',
        });
      }

      const booking = await prisma.auditoriumBooking.create({
        data: {
          auditoriumId,
          userId,
          title,
          description,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          attendees: attendees || 0,
          status: 'pending',
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
