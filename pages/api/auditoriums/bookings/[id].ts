import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  const bookingId = String(id);

  // GET: Fetch a specific booking
  if (req.method === 'GET') {
    try {
      const booking = await prisma.auditoriumBooking.findUnique({
        where: { id: bookingId },
        include: {
          auditorium: true,
          user: {
            select: {
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      return res.status(200).json({ success: true, data: booking });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to fetch booking' });
    }
  }

  // PUT: Update a booking
  if (req.method === 'PUT') {
    try {
      const { title, description, startTime, endTime, attendees, status } = req.body;

      // If changing dates, check for conflicts
      if (startTime || endTime) {
        const booking = await prisma.auditoriumBooking.findUnique({
          where: { id: bookingId },
          select: { auditoriumId: true, startTime: true, endTime: true },
        });

        if (!booking) {
          return res.status(404).json({ error: 'Booking not found' });
        }

        const newStartTime = startTime ? new Date(startTime) : booking.startTime;
        const newEndTime = endTime ? new Date(endTime) : booking.endTime;

        const conflictingBooking = await prisma.auditoriumBooking.findFirst({
          where: {
            id: { not: bookingId },
            auditoriumId: booking.auditoriumId,
            status: { in: ['approved', 'pending'] },
            OR: [
              {
                startTime: { lte: newStartTime },
                endTime: { gt: newStartTime },
              },
              {
                startTime: { lt: newEndTime },
                endTime: { gte: newEndTime },
              },
              {
                startTime: { gte: newStartTime },
                endTime: { lte: newEndTime },
              },
            ],
          },
        });

        if (conflictingBooking) {
          return res.status(409).json({
            error: 'Auditorium is already booked during this time period',
          });
        }
      }

      const updatedBooking = await prisma.auditoriumBooking.update({
        where: { id: bookingId },
        data: {
          title,
          description,
          startTime: startTime ? new Date(startTime) : undefined,
          endTime: endTime ? new Date(endTime) : undefined,
          attendees: attendees ? Number(attendees) : undefined,
          status,
        },
      });

      return res.status(200).json({ success: true, data: updatedBooking });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to update booking' });
    }
  }

  // DELETE: Cancel a booking
  if (req.method === 'DELETE') {
    try {
      await prisma.auditoriumBooking.delete({
        where: { id: bookingId },
      });

      return res.status(200).json({
        success: true,
        message: 'Booking cancelled successfully',
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to cancel booking' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
