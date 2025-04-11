import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

// Mock data
const mockSemesters = [
  {
    id: 'sem-001',
    name: 'Fall 2023',
    code: 'F2023',
    startDate: '2023-09-01',
    endDate: '2023-12-15',
    registrationStartDate: '2023-08-01',
    registrationEndDate: '2023-08-20',
    status: 'completed',
    courseCount: 80,
    studentCount: 820
  },
  {
    id: 'sem-002',
    name: 'Spring 2024',
    code: 'S2024',
    startDate: '2024-01-15',
    endDate: '2024-05-30',
    registrationStartDate: '2023-12-01',
    registrationEndDate: '2023-12-20',
    status: 'active',
    courseCount: 85,
    studentCount: 850
  },
  {
    id: 'sem-003',
    name: 'Summer 2024',
    code: 'SU2024',
    startDate: '2024-06-15',
    endDate: '2024-08-15',
    registrationStartDate: '2024-05-01',
    registrationEndDate: '2024-05-20',
    status: 'upcoming',
    courseCount: 40,
    studentCount: 320
  }
];

// Semester update schema
const updateSemesterSchema = z.object({
  name: z.string().min(2, 'Semester name is required').optional(),
  code: z.string().min(2, 'Semester code is required').optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format').optional(),
  registrationStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Registration start date must be in YYYY-MM-DD format').optional(),
  registrationEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Registration end date must be in YYYY-MM-DD format').optional(),
  status: z.enum(['upcoming', 'active', 'completed']).optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  // Find the semester with the specified ID
  const semesterIndex = mockSemesters.findIndex(s => s.id === id);
  
  if (semesterIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Semester not found'
    });
  }

  // Handle GET request to fetch a specific semester
  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      data: mockSemesters[semesterIndex]
    });
  }
  
  // Handle PUT request to update a semester
  if (req.method === 'PUT') {
    try {
      // Validate request body
      const validatedData = updateSemesterSchema.parse(req.body);
      
      // Check if code already exists and it's not this semester's current code
      if (validatedData.code) {
        const codeExists = mockSemesters.some(
          s => s.code === validatedData.code && s.id !== id
        );
        
        if (codeExists) {
          return res.status(400).json({
            success: false,
            message: 'Semester code already exists'
          });
        }
      }
      
      // In a real application, update in database
      // For demo, just update the mock data
      const updatedSemester = {
        ...mockSemesters[semesterIndex],
        ...validatedData
      };
      
      return res.status(200).json({
        success: true,
        message: 'Semester updated successfully',
        data: updatedSemester
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      
      console.error('Semester update error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Internal server error' 
      });
    }
  }
  
  // Handle DELETE request to delete a semester
  if (req.method === 'DELETE') {
    // In a real application, check for dependencies before deleting
    // For demo, just return success message
    
    return res.status(200).json({
      success: true,
      message: 'Semester deleted successfully'
    });
  }
  
  // Return 405 for other methods
  return res.status(405).json({ success: false, message: 'Method not allowed' });
}
