import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

// Mock courses data
const mockCourses = [
  {
    id: 'course-001',
    code: 'CS101',
    title: 'Introduction to Computer Science',
    credits: 4,
    department: 'Computer Science',
    enrolledStudents: 45,
    maxCapacity: 60,
  },
  {
    id: 'course-002',
    code: 'MATH201',
    title: 'Calculus I',
    credits: 4,
    department: 'Mathematics',
    enrolledStudents: 55,
    maxCapacity: 60,
  },
  {
    id: 'course-003',
    code: 'PHYS101',
    title: 'General Physics',
    credits: 4,
    department: 'Physics',
    enrolledStudents: 38,
    maxCapacity: 50,
  }
];

// Mock enrollments data
const mockEnrollments = [
  {
    id: 'enrollment-001',
    studentId: 'student-001',
    courseId: 'course-001',
    enrollmentDate: '2023-08-15',
    status: 'active'
  }
];

// Enrollment schema
const enrollmentSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  courseId: z.string().min(1, 'Course ID is required'),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST method for enrollments
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Validate request body
    const validatedData = enrollmentSchema.parse(req.body);
    const { studentId, courseId } = validatedData;
    
    // Check if course exists
    const course = mockCourses.find(c => c.id === courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }
    
    // Check if course has available capacity
    if (course.enrolledStudents >= course.maxCapacity) {
      return res.status(400).json({
        success: false,
        message: 'Course is already at maximum capacity'
      });
    }
    
    // Check if student is already enrolled in this course
    const existingEnrollment = mockEnrollments.find(
      e => e.studentId === studentId && e.courseId === courseId && e.status === 'active'
    );
    
    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'Student is already enrolled in this course'
      });
    }
    
    // Create new enrollment
    const newEnrollment = {
      id: `enrollment-${Date.now()}`,
      studentId,
      courseId,
      enrollmentDate: new Date().toISOString().split('T')[0],
      status: 'active'
    };
    
    // In a real application, save to database and update course enrollment count
    // For demo, just return success
    
    return res.status(201).json({
      success: true,
      message: 'Enrollment successful',
      data: newEnrollment
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation error', 
        errors: error.errors 
      });
    }
    
    console.error('Enrollment error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
}
