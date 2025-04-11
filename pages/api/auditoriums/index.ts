import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // GET: List all auditoriums
  if (req.method === 'GET') {
    try {
      const { status } = req.query;
      
      let whereClause: any = {};
      if (status) whereClause.status = String(status);
      
      const auditoriums = await prisma.auditorium.findMany({
        where: whereClause,
        include: {
          bookings: {
            where: {
              startTime: {
                gte: new Date()
              }
            },
            orderBy: {
              startTime: 'asc'
            }
          }
        }
      });

      return res.status(200).json({ success: true, data: auditoriums });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to fetch auditoriums' });
    }
  }

  // POST: Create a new auditorium
  if (req.method === 'POST') {
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

      if (!name || !location || !capacity) {
        return res.status(400).json({ error: 'Name, location and capacity are required' });
      }

      const auditorium = await prisma.auditorium.create({
        data: {
          name,
          location,
          capacity: Number(capacity),
          amenities,
          status: status || 'available',
          hasWhiteboard: hasWhiteboard || false,
          description
        },
      });

      return res.status(201).json({ success: true, data: auditorium });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to create auditorium' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
