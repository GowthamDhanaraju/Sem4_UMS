import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { verifyToken } from '../../../lib/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
  }

  // Get the token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      message: 'Unauthorized' 
    });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid token' 
    });
  }

  try {
    // Get student details
    const student = await prisma.student.findFirst({
      where: { userId: decoded.id },
      include: {
        enrollments: {
          include: {
            course: true
          }
        }
      }
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Get all attendance records for this student
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        studentId: student.id
      },
      include: {
        course: true
      },
      orderBy: {
        date: 'desc'
      }
    });

    // Group attendance records by course
    const attendanceByCourse = {};
    
    // First, initialize with enrolled courses
    student.enrollments.forEach(enrollment => {
      const courseId = enrollment.courseId;
      const courseName = enrollment.course.name;
      const courseCode = enrollment.course.code;
      
      attendanceByCourse[courseId] = {
        courseName,
        courseCode,
        attendance: [],
        stats: {
          total: 0,
          present: 0,
          absent: 0,
          leave: 0,
          percentage: 0
        }
      };
    });
    
    // Then add attendance records
    attendanceRecords.forEach(record => {
      const courseId = record.courseId;
      
      // Skip if this is for a course the student is no longer enrolled in
      if (!attendanceByCourse[courseId]) return;
      
      attendanceByCourse[courseId].attendance.push({
        date: record.date.toISOString().split('T')[0],
        status: record.status
      });
      
      // Update stats
      attendanceByCourse[courseId].stats.total++;
      
      if (record.status === 'PRESENT') {
        attendanceByCourse[courseId].stats.present++;
      } else if (record.status === 'ABSENT') {
        attendanceByCourse[courseId].stats.absent++;
      } else {
        attendanceByCourse[courseId].stats.leave++;
      }
    });
    
    // Calculate percentages
    Object.keys(attendanceByCourse).forEach(courseId => {
      const stats = attendanceByCourse[courseId].stats;
      if (stats.total > 0) {
        stats.percentage = Math.round((stats.present / stats.total) * 100);
      }
    });

    // Return formatted data
    return res.status(200).json({
      success: true,
      data: attendanceByCourse
    });
  } catch (error) {
    console.error('Error fetching student attendance:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance data',
      error: error.message
    });
  }
}
