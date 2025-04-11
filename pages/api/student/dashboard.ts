import { NextApiRequest, NextApiResponse } from 'next';
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
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        department: true,
        enrollments: {
          include: {
            course: true
          },
          take: 5 // Limit to 5 recent courses
        }
      }
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Format enrollments into courses
    const currentCourses = student.enrollments.map(enrollment => ({
      id: enrollment.courseId,
      name: enrollment.course.name,
      code: enrollment.course.code,
      credits: enrollment.course.credits
    }));

    // Return student data
    return res.status(200).json({
      success: true,
      data: {
        id: student.id,
        studentId: student.studentId,
        name: student.user.name,
        email: student.user.email,
        dept: student.department?.name || 'Computer Science',
        year: student.year || '2',
        semester: student.semester || '3',
        cgpa: student.cgpa?.toString() || '3.8',
        currentCourses
      }
    });
  } catch (error) {
    console.error('Error fetching student dashboard data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch student data'
    });
  }
}
