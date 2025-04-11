import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // GET: List attendance records with filtering options
  if (req.method === 'GET') {
    try {
      const { courseId, studentId, date, month, year } = req.query;
      
      let whereClause: any = {};
      
      if (courseId) whereClause.courseId = String(courseId);
      if (studentId) whereClause.studentId = String(studentId);
      
      if (date && month && year) {
        const startDate = new Date(Number(year), Number(month) - 1, Number(date));
        const endDate = new Date(Number(year), Number(month) - 1, Number(date) + 1);
        whereClause.date = {
          gte: startDate,
          lt: endDate
        };
      } else if (month && year) {
        const startDate = new Date(Number(year), Number(month) - 1, 1);
        const endDate = new Date(Number(year), Number(month), 0);
        whereClause.date = {
          gte: startDate,
          lte: endDate
        };
      }
      
      const attendance = await prisma.attendance.findMany({
        where: whereClause,
        include: {
          student: {
            include: {
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
          course: true,
        },
        orderBy: {
          date: 'desc',
        },
      });

      return res.status(200).json({ success: true, data: attendance });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to fetch attendance records' });
    }
  }

  // POST: Create new attendance records (batch)
  if (req.method === 'POST') {
    try {
      const { records } = req.body;
      
      if (!records || !Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ error: 'Valid attendance records are required' });
      }

      // Batch create attendance records
      const result = await prisma.$transaction(
        records.map(record => 
          prisma.attendance.create({
            data: {
              courseId: record.courseId,
              studentId: record.studentId,
              date: new Date(record.date),
              status: record.status,
              notes: record.notes,
            },
          })
        )
      );

      return res.status(201).json({ success: true, data: result });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to create attendance records' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
