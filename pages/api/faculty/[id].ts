import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

// Mock data
const mockFaculty = [
  {
    id: 'faculty-001',
    facultyId: 'F100123',
    name: 'Jane Professor',
    email: 'faculty@university.edu',
    department: 'Computer Science',
    position: 'Associate Professor',
    specialization: 'Artificial Intelligence',
    officeLocation: 'Science Building, Room 405',
    officeHours: 'Monday, Wednesday 14:00-16:00',
    contactNumber: '+1122334455',
    hireDate: '2018-08-15',
    status: 'active',
    courses: ['course-001']
  },
  {
    id: 'faculty-002',
    facultyId: 'F100124',
    name: 'Robert Johnson',
    email: 'rjohnson@university.edu',
    department: 'Mathematics',
    position: 'Professor',
    specialization: 'Applied Mathematics, Calculus',
    officeLocation: 'Mathematics Building, Room 210',
    officeHours: 'Tuesday, Thursday 10:00-12:00',
    contactNumber: '+1122556677',
    hireDate: '2010-01-10',
    status: 'active',
    courses: ['course-002']
  }
];

// Faculty update schema
const updateFacultySchema = z.object({
  name: z.string().min(2, 'Name is required').optional(),
  email: z.string().email('Valid email is required').optional(),
  department: z.string().min(1, 'Department is required').optional(),
  position: z.string().min(1, 'Position is required').optional(),
  specialization: z.string().optional(),
  officeLocation: z.string().optional(),
  officeHours: z.string().optional(),
  contactNumber: z.string().optional(),
  hireDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Hire date must be in YYYY-MM-DD format').optional(),
  status: z.enum(['active', 'inactive', 'on leave', 'retired']).optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  // Find the faculty member with the specified ID
  const facultyIndex = mockFaculty.findIndex(f => f.id === id || f.facultyId === id);
  
  if (facultyIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Faculty member not found'
    });
  }

  // Handle GET request to fetch a specific faculty member
  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      data: mockFaculty[facultyIndex]
    });
  }
  
  // Handle PUT request to update a faculty member
  if (req.method === 'PUT') {
    try {
      // Validate request body
      const validatedData = updateFacultySchema.parse(req.body);
      
      // In a real application, update in database
      // For demo, just update the mock data
      const updatedFaculty = {
        ...mockFaculty[facultyIndex],
        ...validatedData
      };
      
      return res.status(200).json({
        success: true,
        message: 'Faculty information updated successfully',
        data: updatedFaculty
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      
      console.error('Faculty update error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Internal server error' 
      });
    }
  }
  
  // Handle DELETE request to delete a faculty member
  if (req.method === 'DELETE') {
    // In a real application, delete from database or mark as inactive
    // For demo, just return success message
    
    return res.status(200).json({
      success: true,
      message: 'Faculty record deleted successfully'
    });
  }
  
  // Return 405 for other methods
  return res.status(405).json({ success: false, message: 'Method not allowed' });
}
