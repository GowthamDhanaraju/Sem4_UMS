import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  const entryId = String(id);

  // GET specific timetable entry
  if (req.method === 'GET') {
    try {
      const entry = await prisma.timetableEntry.findUnique({
        where: { id: entryId },
        include: {
          course: true,
          teacher: {
            include: {
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!entry) {
        return res.status(404).json({ error: 'Timetable entry not found' });
      }

      return res.status(200).json({ success: true, data: entry });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to fetch timetable entry' });
    }
  }

  // PUT update timetable entry
  if (req.method === 'PUT') {
    try {
      const { 
        courseId, 
        teacherId, 
        day, 
        startTime,
        endTime,
        section,
        roomNumber
      } = req.body;

      // Check for conflicts with other entries
      if (day || startTime || endTime || section || roomNumber) {
        const currentEntry = await prisma.timetableEntry.findUnique({
          where: { id: entryId },
        });

        if (!currentEntry) {
          return res.status(404).json({ error: 'Timetable entry not found' });
        }

        const conflictQuery = {
          where: {
            id: { not: entryId },
            day: day || currentEntry.day,
            section: section || currentEntry.section,
            OR: [
              {
                // Time overlap
                startTime: { lte: endTime || currentEntry.endTime },
                endTime: { gte: startTime || currentEntry.startTime },
              },
              {
                // Same room at the same time
                roomNumber: roomNumber || currentEntry.roomNumber,
                startTime: { lte: endTime || currentEntry.endTime },
                endTime: { gte: startTime || currentEntry.startTime },
              },
              {
                // Same teacher at the same time
                teacherId: teacherId || currentEntry.teacherId,
                startTime: { lte: endTime || currentEntry.endTime },
                endTime: { gte: startTime || currentEntry.startTime },
              },
            ],
          },
        };

        const existingEntry = await prisma.timetableEntry.findFirst(conflictQuery);

        if (existingEntry) {
          return res.status(400).json({ 
            error: 'There is a scheduling conflict with this entry' 
          });
        }
      }

      const updatedEntry = await prisma.timetableEntry.update({
        where: { id: entryId },
        data: {
          courseId,
          teacherId,
          day,
          startTime,
          endTime,
          section,
          roomNumber,
        },
      });

      return res.status(200).json({ success: true, data: updatedEntry });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to update timetable entry' });
    }
  }

  // DELETE timetable entry
  if (req.method === 'DELETE') {
    try {
      await prisma.timetableEntry.delete({
        where: { id: entryId },
      });

      return res.status(200).json({ 
        success: true, 
        message: 'Timetable entry deleted successfully' 
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to delete timetable entry' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
