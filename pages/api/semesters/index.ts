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

// Semester creation schema
const createSemesterSchema = z.object({
  name: z.string().min(2, 'Semester name is required'),
  code: z.string().min(2, 'Semester code is required'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format'),
  registrationStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Registration start date must be in YYYY-MM-DD format'),
  registrationEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Registration end date must be in YYYY-MM-DD format'),
  status: z.enum(['upcoming', 'active', 'completed']).default('upcoming'),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Handle GET request to list semesters
  if (req.method === 'GET') {
    // Query parameters for filtering
    const { status } = req.query;
    
    let filteredSemesters = [...mockSemesters];
    
    // Apply filter
    if (status) {
      filteredSemesters = filteredSemesters.filter(
        semester => semester.status === status
      );
    }
    
    return res.status(200).json({
      success: true,
      data: filteredSemesters
    });
  }
  
  // Handle POST request to create a new semester
  if (req.method === 'POST') {
    try {
      // Validate request body
      const validatedData = createSemesterSchema.parse(req.body);
      
      // Check if semester code already exists
      const codeExists = mockSemesters.some(
        sem => sem.code === validatedData.code
      );
      
      if (codeExists) {
        return res.status(400).json({
          success: false,
          message: 'Semester code already exists'
        });
      }
      
      // Validate date logic
      const startDate = new Date(validatedData.startDate);
      const endDate = new Date(validatedData.endDate);
      const regStartDate = new Date(validatedData.registrationStartDate);
      const regEndDate = new Date(validatedData.registrationEndDate);
      
      if (endDate <= startDate) {
        return res.status(400).json({
          success: false,
          message: 'End date must be after start date'
        });
      }
      
      if (regEndDate <= regStartDate) {
        return res.status(400).json({
          success: false,
          message: 'Registration end date must be after registration start date'
        });
      }
      
      // Create new semester
      const newSemester = {
        id: `sem-${Date.now()}`,
        ...validatedData,
        courseCount: 0,
        studentCount: 0
      };
      
      // In a real application, save to database
      // For demo, just return the created semester
      
      return res.status(201).json({
        success: true,
        message: 'Semester created successfully',
        data: newSemester
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      
      console.error('Semester creation error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Internal server error' 
      });
    }
  }
  
  // Return 405 for other methods
  return res.status(405).json({ success: false, message: 'Method not allowed' });
}
