import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  const auditoriumId = String(id);

  // GET: Fetch a specific auditorium
  if (req.method === 'GET') {
    try {
      const auditorium = await prisma.auditorium.findUnique({
        where: { id: auditoriumId },
        include: {
          bookings: {
            orderBy: {
              startTime: 'asc'
            }
          }
        }
      });

      if (!auditorium) {
        return res.status(404).json({ error: 'Auditorium not found' });
      }

      return res.status(200).json({ success: true, data: auditorium });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to fetch auditorium' });
    }
  }

  // PUT: Update an auditorium
  if (req.method === 'PUT') {
    try {
      const {
        name,
        location,
        capacity,
        amenities,
        status,
        hasWhiteboard,
        description
      } = req.body;

      const updatedAuditorium = await prisma.auditorium.update({
        where: { id: auditoriumId },
        data: {
          name,
          location,
          capacity: capacity ? Number(capacity) : undefined,
          amenities,
          status,
          hasWhiteboard,
          description
        },
      });

      return res.status(200).json({ success: true, data: updatedAuditorium });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to update auditorium' });
    }
  }

  // DELETE: Remove an auditorium
  if (req.method === 'DELETE') {
    try {
      await prisma.auditorium.delete({
        where: { id: auditoriumId },
      });

      return res.status(200).json({
        success: true,
        message: 'Auditorium deleted successfully',
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to delete auditorium' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
