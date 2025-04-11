import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

// Mock enrollments data
const mockEnrollments = [
  {
    id: 'enrollment-001',
    studentId: 'student-001',
    courseId: 'course-001',
    enrollmentDate: '2023-08-15',
    status: 'active'
  },
  {
    id: 'enrollment-002',
    studentId: 'student-001',
    courseId: 'course-002',
    enrollmentDate: '2023-08-16',
    status: 'active'
  }
];

// Withdrawal schema
const withdrawalSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  courseId: z.string().min(1, 'Course ID is required'),
  reason: z.string().optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST method for withdrawals
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Validate request body
    const validatedData = withdrawalSchema.parse(req.body);
    const { studentId, courseId, reason } = validatedData;
    
    // Check if enrollment exists
    const enrollmentIndex = mockEnrollments.findIndex(
      e => e.studentId === studentId && e.courseId === courseId && e.status === 'active'
    );
    
    if (enrollmentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'No active enrollment found for this student and course'
      });
    }
    
    // In a real application:
    // 1. Update enrollment status to "withdrawn"
    // 2. Decrease course enrollment count
    // 3. Record withdrawal reason and timestamp
    
    // For demo, just return success
    
    return res.status(200).json({
      success: true,
      message: 'Course withdrawal successful',
      data: {
        enrollmentId: mockEnrollments[enrollmentIndex].id,
        withdrawalDate: new Date().toISOString().split('T')[0],
        reason: reason || 'Not specified'
      }
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation error', 
        errors: error.errors 
      });
    }
    
    console.error('Withdrawal error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
}
