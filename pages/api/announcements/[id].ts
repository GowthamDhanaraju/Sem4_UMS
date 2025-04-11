import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  const announcementId = String(id);

  // GET: Fetch a specific announcement
  if (req.method === 'GET') {
    try {
      const announcement = await prisma.announcement.findUnique({
        where: { id: announcementId },
        include: {
          author: {
            select: {
              name: true,
            },
          },
          department: true,
        },
      });

      if (!announcement) {
        return res.status(404).json({ error: 'Announcement not found' });
      }

      return res.status(200).json({ success: true, data: announcement });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to fetch announcement' });
    }
  }

  // PUT: Update an announcement
  if (req.method === 'PUT') {
    try {
      const {
        title,
        content,
        audience,
        departmentId,
        expiryDate,
        important,
      } = req.body;

      const updatedAnnouncement = await prisma.announcement.update({
        where: { id: announcementId },
        data: {
          title,
          content,
          audience,
          departmentId,
          expiryDate: expiryDate ? new Date(expiryDate) : undefined,
          important,
        },
      });

      return res.status(200).json({ success: true, data: updatedAnnouncement });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to update announcement' });
    }
  }

  // DELETE: Remove an announcement
  if (req.method === 'DELETE') {
    try {
      await prisma.announcement.delete({
        where: { id: announcementId },
      });

      return res.status(200).json({
        success: true,
        message: 'Announcement deleted successfully',
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to delete announcement' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
