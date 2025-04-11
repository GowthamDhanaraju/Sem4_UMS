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
  
  if (!decoded || decoded.role !== 'TEACHER') {
    return res.status(401).json({ 
      success: false, 
      message: 'Unauthorized access' 
    });
  }

  try {
    // Get teacher details
    const teacher = await prisma.teacher.findFirst({
      where: { userId: decoded.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        department: true,
        teacherCourses: {
          include: {
            course: {
              include: {
                department: true,
                enrollments: {
                  include: {
                    student: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Extract courses the teacher is teaching
    const courses = teacher.teacherCourses.map(tc => {
      const course = tc.course;
      const studentCount = course.enrollments.length;
      
      return {
        id: course.id,
        code: course.code,
        name: course.name,
        department: course.department.name,
        departmentCode: course.department.code,
        studentCount
      };
    });

    // Count total students across all courses (unique students)
    const uniqueStudentIds = new Set();
    teacher.teacherCourses.forEach(tc => {
      tc.course.enrollments.forEach(enrollment => {
        uniqueStudentIds.add(enrollment.student.id);
      });
    });
    
    // Get upcoming classes or recent activities
    // This would typically come from a schedule database
    // For now we'll use placeholder data
    const upcomingClasses = courses.slice(0, 3).map(course => ({
      courseId: course.id,
      courseName: course.name,
      courseCode: course.code,
      time: new Date(Date.now() + Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString(),
      location: `Room ${100 + Math.floor(Math.random() * 100)}`
    }));

    return res.status(200).json({
      success: true,
      data: {
        name: teacher.user.name,
        email: teacher.user.email,
        department: teacher.department?.name || 'Computer Science',
        teacherId: teacher.teacherId || 'T' + teacher.id.substring(0, 6),
        courses,
        totalStudents: uniqueStudentIds.size,
        upcomingClasses,
        recentActivities: [
          {
            type: 'attendance',
            description: 'Marked attendance for Advanced Algorithms',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
          },
          {
            type: 'grade',
            description: 'Posted midterm grades for Database Systems',
            timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
          },
          {
            type: 'feedback',
            description: 'Received new course feedback',
            timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
          }
        ]
      }
    });
  } catch (error) {
    console.error('Error fetching teacher dashboard data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch teacher data'
    });
  }
}
