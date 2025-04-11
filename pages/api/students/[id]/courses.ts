import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  const { id } = req.query;
  const studentId = Array.isArray(id) ? id[0] : id;

  try {
    // First, try to find the student by various ID fields
    let student = null;
    
    // Try finding by ID directly
    student = await prisma.student.findUnique({
      where: { id: studentId }
    });
    
    // If not found, try by studentId field
    if (!student) {
      student = await prisma.student.findUnique({
        where: { studentId: studentId }
      });
    }
    
    // If still not found, try by userId
    if (!student) {
      student = await prisma.student.findFirst({
        where: { userId: studentId }
      });
    }
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Fetch all enrollments for this student
    const enrollments = await prisma.enrollment.findMany({
      where: {
        studentId: student.id,
        status: {
          notIn: ['Withdrawn', 'Cancelled']
        }
      },
      include: {
        course: {
          include: {
            department: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // Get teachers for these courses
    const courseIds = enrollments.map(e => e.courseId);
    const teacherCourses = await prisma.teacherCourse.findMany({
      where: {
        courseId: { in: courseIds }
      },
      include: {
        teacher: {
          include: {
            user: true
          }
        }
      }
    });

    // Check for existing feedback
    const existingFeedback = await prisma.feedback.findMany({
      where: {
        studentId: student.id,
        courseId: { in: courseIds }
      }
    });

    // Create a mapping of course IDs to feedback status
    const feedbackSubmitted = new Map();
    existingFeedback.forEach(feedback => {
      feedbackSubmitted.set(feedback.courseId, true);
    });

    // Format courses with teacher information
    const courses = enrollments.map(enrollment => {
      // Find teacher for this course
      const teacherCourse = teacherCourses.find(tc => tc.courseId === enrollment.courseId);
      
      return {
        id: enrollment.courseId,
        title: enrollment.course.name,
        code: enrollment.course.code,
        credits: enrollment.course.credits,
        department: enrollment.course.department.name,
        instructorId: teacherCourse?.teacherId || '',
        instructorName: teacherCourse?.teacher?.name || teacherCourse?.teacher?.user?.name || 'Instructor',
        instructorDesignation: teacherCourse?.teacher?.designation || 'Faculty',
        semester: `${enrollment.year} - Semester ${enrollment.semester}`,
        status: enrollment.status,
        hasFeedbackSubmitted: feedbackSubmitted.has(enrollment.courseId)
      };
    });

    return res.status(200).json({
      success: true,
      data: courses
    });
  } catch (error) {
    console.error('Failed to fetch student courses:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch courses',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
