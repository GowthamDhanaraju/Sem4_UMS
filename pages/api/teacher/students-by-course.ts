import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { verifyToken } from '../../../lib/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // Extract and verify token
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  
  const decoded = verifyToken(token);
  if (!decoded || decoded.role !== 'TEACHER') {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const { courseId } = req.query;
  
  if (!courseId) {
    return res.status(400).json({ success: false, message: 'Course ID is required' });
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

    // Format student data
    const students = enrollments.map(enrollment => ({
      id: enrollment.student.id,
      name: enrollment.student.user.name || enrollment.student.name,
      studentId: enrollment.student.studentId
    }));

    return res.status(200).json({
      success: true,
      data: students
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch students',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
