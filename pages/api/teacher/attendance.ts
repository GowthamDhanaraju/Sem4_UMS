import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { verifyToken } from '../../../lib/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verify authentication
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  
  const decoded = verifyToken(token);
  if (!decoded || decoded.role !== 'TEACHER') {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  // GET: Fetch attendance records for a specific course and date
  if (req.method === 'GET') {
    const { courseId, date } = req.query;
    
    if (!courseId || !date) {
      return res.status(400).json({ success: false, message: 'Course ID and date are required' });
    }

    try {
      // Check if teacher is authorized to access this course
      const teacher = await prisma.teacher.findFirst({
        where: { userId: decoded.id }
      });

      if (!teacher) {
        return res.status(404).json({ success: false, message: 'Teacher not found' });
      }

      const teacherCourse = await prisma.teacherCourse.findFirst({
        where: {
          teacherId: teacher.id,
          courseId: String(courseId)
        }
      });

      if (!teacherCourse) {
        return res.status(403).json({ success: false, message: 'Not authorized to access this course' });
      }

      // Get enrolled students for this course
      const enrollments = await prisma.enrollment.findMany({
        where: {
          courseId: String(courseId),
          status: 'In Progress'
        },
        include: {
          student: {
            include: {
              user: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      });

      // Get attendance records for this date and course
      const attendanceDate = new Date(String(date));
      const attendanceRecords = await prisma.attendance.findMany({
        where: {
          courseId: String(courseId),
          date: {
            gte: new Date(attendanceDate.setHours(0, 0, 0, 0)),
            lt: new Date(attendanceDate.setHours(23, 59, 59, 999))
          }
        }
      });

      // Format attendance data
      const attendanceData = attendanceRecords.map(record => ({
        studentId: record.studentId,
        status: record.status,
        note: record.note
      }));

      return res.status(200).json(attendanceData);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch attendance records',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // POST: Save attendance records
  if (req.method === 'POST') {
    try {
      const { courseId, date, records } = req.body;
      
      if (!courseId || !date || !records || !Array.isArray(records)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Course ID, date, and attendance records are required' 
        });
      }

      // Check if teacher is authorized to update this course
      const teacher = await prisma.teacher.findFirst({
        where: { userId: decoded.id }
      });

      if (!teacher) {
        return res.status(404).json({ success: false, message: 'Teacher not found' });
      }

      const teacherCourse = await prisma.teacherCourse.findFirst({
        where: {
          teacherId: teacher.id,
          courseId: String(courseId)
        }
      });

      if (!teacherCourse) {
        return res.status(403).json({ success: false, message: 'Not authorized to update this course' });
      }

      // Process each attendance record
      const attendanceDate = new Date(date);

      // Create array for transactions
      const transactions = [];

      for (const record of records) {
        const { studentId, status } = record;
        
        // Find if an attendance record already exists
        const existingRecord = await prisma.attendance.findFirst({
          where: {
            studentId: String(studentId),
            courseId: String(courseId),
            date: {
              gte: new Date(attendanceDate.setHours(0, 0, 0, 0)),
              lt: new Date(attendanceDate.setHours(23, 59, 59, 999))
            }
          }
        });

        if (existingRecord) {
          // Update existing record
          transactions.push(
            prisma.attendance.update({
              where: { id: existingRecord.id },
              data: {
                status: status,
                note: record.note || null,
                updatedAt: new Date()
              }
            })
          );
        } else {
          // Create new record
          transactions.push(
            prisma.attendance.create({
              data: {
                studentId: String(studentId),
                courseId: String(courseId),
                date: new Date(date),
                status: status,
                note: record.note || null
              }
            })
          );
        }
      }

      // Execute all transactions
      await prisma.$transaction(transactions);

      return res.status(200).json({ 
        success: true, 
        message: 'Attendance records saved successfully' 
      });
    } catch (error) {
      console.error('Error saving attendance:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to save attendance records',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Method not allowed
  return res.status(405).json({ success: false, message: 'Method not allowed' });
}
