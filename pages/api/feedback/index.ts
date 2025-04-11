import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schema for feedback data
const feedbackSchema = z.object({
  studentId: z.string(),
  facultyId: z.string(),
  courseId: z.string(),
  courseName: z.string().optional(),
  facultyName: z.string().optional(),
  courseRatings: z.object({
    contentQuality: z.number().min(1).max(5),
    difficultyLevel: z.number().min(1).max(5),
    practicalApplication: z.number().min(1).max(5)
  }),
  facultyRatings: z.object({
    teachingQuality: z.number().min(1).max(5),
    communication: z.number().min(1).max(5),
    availability: z.number().min(1).max(5)
  }),
  overallRating: z.number().min(1).max(5),
  comments: z.string().optional(),
  date: z.string().optional()
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Validate request data
    const validData = feedbackSchema.parse(req.body);

    // First, check if the course exists
    const course = await prisma.course.findUnique({
      where: { id: validData.courseId }
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if the teacher exists
    const teacher = await prisma.teacher.findUnique({
      where: { id: validData.facultyId }
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Create feedback record in database
    const feedback = await prisma.feedback.create({
      data: {
        studentId: validData.studentId,
        teacherId: validData.facultyId,
        courseId: validData.courseId,
        courseRating: validData.courseRatings,
        teacherRating: validData.facultyRatings,
        overallRating: validData.overallRating,
        comments: validData.comments || '',
        date: validData.date ? new Date(validData.date) : new Date()
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: feedback
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid feedback data',
        errors: error.errors
      });
    }

    console.error('Error submitting feedback:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit feedback'
    });
  }
}
