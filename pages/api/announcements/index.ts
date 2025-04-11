import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // GET: List all announcements
  if (req.method === 'GET') {
    try {
      const { audience, departmentId, important } = req.query;
      
      let whereClause: any = {};
      
      if (audience) whereClause.audience = String(audience);
      if (departmentId) whereClause.departmentId = String(departmentId);
      if (important === 'true') whereClause.important = true;
      
      // Only show non-expired announcements
      whereClause.expiryDate = {
        gte: new Date()
      };
      
      const announcements = await prisma.announcements.findMany({
        where: whereClause,
        include: {
          author: {
            select: {
              name: true,
            },
          },
          department: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return res.status(200).json({ success: true, data: announcements });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to fetch announcements' });
    }
  }

  // POST: Create a new announcement
  if (req.method === 'POST') {
    try {
      const {
        title,
        content,
        authorId,
        audience,
        departmentId,
        expiryDate,
        important,
      } = req.body;

      if (!title || !content || !authorId) {
        return res.status(400).json({ error: 'Title, content and author are required' });
      }

      const announcement = await prisma.announcement.create({
        data: {
          title,
          content,
          authorId,
          audience,
          departmentId,
          expiryDate: expiryDate ? new Date(expiryDate) : undefined,
          important: important || false,
        },
      });

      return res.status(201).json({ success: true, data: announcement });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to create announcement' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
