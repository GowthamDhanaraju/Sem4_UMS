import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // GET timetable entries, with optional filtering
  if (req.method === 'GET') {
    try {
      const { section, day } = req.query;
      
      const whereClause: any = {};
      if (section) whereClause.section = String(section);
      if (day) whereClause.day = String(day);

      const timetable = await prisma.timetableEntry.findMany({
        where: whereClause,
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
        orderBy: [
          { day: 'asc' },
          { startTime: 'asc' },
        ],
      });

      return res.status(200).json({ success: true, data: timetable });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to fetch timetable' });
    }
  }

  // POST create new timetable entry
  if (req.method === 'POST') {
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

      // Check for conflicts
      const existingEntry = await prisma.timetableEntry.findFirst({
        where: {
          day,
          section,
          OR: [
            {
              // Time overlap
              startTime: { lte: endTime },
              endTime: { gte: startTime },
            },
            {
              // Same room at the same time
              roomNumber,
              startTime: { lte: endTime },
              endTime: { gte: startTime },
            },
            {
              // Same teacher at the same time
              teacherId,
              startTime: { lte: endTime },
              endTime: { gte: startTime },
            },
          ],
        },
      });

      if (existingEntry) {
        return res.status(400).json({ 
          error: 'There is a scheduling conflict with this entry' 
        });
      }

      const timetableEntry = await prisma.timetableEntry.create({
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

      return res.status(201).json({ success: true, data: timetableEntry });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to create timetable entry' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
