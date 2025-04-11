import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

// Mock data
const mockAttendance = [
  {
    id: 'att-001',
    courseId: 'course-001',
    courseName: 'Introduction to Computer Science',
    studentId: 'student-001',
    studentName: 'John Student',
    date: '2024-03-15',
    status: 'present',
    remarks: 'Participated actively in class discussion',
    recordedBy: 'faculty-001'
  },
  {
    id: 'att-002',
    courseId: 'course-001',
    courseName: 'Introduction to Computer Science',
    studentId: 'student-002',
    studentName: 'Alice Johnson',
    date: '2024-03-15',
    status: 'absent',
    remarks: 'No notification provided',
    recordedBy: 'faculty-001'
  },
  {
    id: 'att-003',
    courseId: 'course-002',
    courseName: 'Calculus I',
    studentId: 'student-001',
    studentName: 'John Student',
    date: '2024-03-15',
    status: 'present',
    remarks: '',
    recordedBy: 'faculty-002'
  }
];

// Attendance update schema
const updateAttendanceSchema = z.object({
  status: z.enum(['present', 'absent', 'late', 'excused']).optional(),
  remarks: z.string().optional(),
  recordedBy: z.string().min(1, 'Faculty ID is required').optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  // Find the attendance record with the specified ID
  const recordIndex = mockAttendance.findIndex(r => r.id === id);
  
  if (recordIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Attendance record not found'
    });
  }

  // Handle GET request to fetch a specific attendance record
  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      data: mockAttendance[recordIndex]
    });
  }
  
  // Handle PUT request to update an attendance record
  if (req.method === 'PUT') {
    try {
      // Validate request body
      const validatedData = updateAttendanceSchema.parse(req.body);
      
      // In a real application, update in database
      // For demo, just update the mock data
      const updatedRecord = {
        ...mockAttendance[recordIndex],
        ...validatedData
      };
      
      return res.status(200).json({
        success: true,
        message: 'Attendance record updated successfully',
        data: updatedRecord
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      
      console.error('Attendance update error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Internal server error' 
      });
    }
  }
  
  // Handle DELETE request to delete an attendance record
  if (req.method === 'DELETE') {
    // In a real application, delete from database
    // For demo, just return success message
    
    return res.status(200).json({
      success: true,
      message: 'Attendance record deleted successfully'
    });
  }
  
  // Return 405 for other methods
  return res.status(405).json({ success: false, message: 'Method not allowed' });
}
