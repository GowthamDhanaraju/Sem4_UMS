import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../../lib/prisma';
import { verifyToken } from '../../../../../lib/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { id } = req.query;
  const courseId = Array.isArray(id) ? id[0] : id;

  try {
    // Verify JWT token from Authorization header
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = verifyToken(token);
    
    if (!decoded || decoded.role !== 'TEACHER') {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Find teacher by user ID
    const teacher = await prisma.teacher.findFirst({
      where: {
        userId: decoded.id
      }
    });

    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    // Verify teacher teaches this course
    const teacherCourse = await prisma.teacherCourse.findFirst({
      where: {
        teacherId: teacher.id,
        courseId: courseId as string
      }
    });

    if (!teacherCourse) {
      return res.status(403).json({ message: 'You do not teach this course' });
    }

    // Find students enrolled in this course
    const enrollments = await prisma.enrollment.findMany({
      where: {
        courseId: courseId as string
      },
      include: {
        student: {
          include: {
            user: true
          }
        }
      }
    });

    // Format the response
    const students = enrollments.map(enrollment => {
      return {
        id: enrollment.studentId,
        name: enrollment.student.user.name,
        studentId: enrollment.student.studentId,
        email: enrollment.student.user.email,
        section: enrollment.section || 'A',
        attendance: 0 // This would be calculated from attendance records
      };
    });

    return res.status(200).json(students);
  } catch (error) {
    console.error('Error fetching course students:', error);
    return res.status(500).json({ message: 'Failed to fetch students' });
  }
}
