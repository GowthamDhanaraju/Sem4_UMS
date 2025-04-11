import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

// Mock data
const mockPrograms = [
  {
    id: 'prog-001',
    name: 'Bachelor of Science in Computer Science',
    code: 'BSCS',
    departmentId: 'dept-001',
    department: 'Computer Science',
    degree: 'Bachelor',
    credits: 120,
    duration: 4, // years
    studentCount: 180,
    coordinator: 'faculty-002',
    coordinatorName: 'Dr. Robert Johnson',
    description: 'A comprehensive program covering all aspects of computer science',
    createdAt: '2020-01-01'
  },
  {
    id: 'prog-002',
    name: 'Master of Science in Computer Science',
    code: 'MSCS',
    departmentId: 'dept-001',
    department: 'Computer Science',
    degree: 'Master',
    credits: 36,
    duration: 2, // years
    studentCount: 45,
    coordinator: 'faculty-001',
    coordinatorName: 'Dr. Jane Professor',
    description: 'Advanced studies in computer science with research focus',
    createdAt: '2020-01-01'
  },
  {
    id: 'prog-003',
    name: 'Bachelor of Science in Mathematics',
    code: 'BSMA',
    departmentId: 'dept-002',
    department: 'Mathematics',
    degree: 'Bachelor',
    credits: 120,
    duration: 4, // years
    studentCount: 120,
    coordinator: 'faculty-005',
    coordinatorName: 'Dr. Linda Chen',
    description: 'A rigorous program in theoretical and applied mathematics',
    createdAt: '2020-01-01'
  }
];

// Program creation schema
const createProgramSchema = z.object({
  name: z.string().min(3, 'Program name is required'),
  code: z.string().min(2, 'Program code is required'),
  departmentId: z.string().min(1, 'Department ID is required'),
  degree: z.enum(['Associate', 'Bachelor', 'Master', 'Doctoral', 'Certificate']),
  credits: z.number().int().positive('Credits must be a positive integer'),
  duration: z.number().positive('Duration must be positive'),
  coordinator: z.string().optional(),
  coordinatorName: z.string().optional(),
  description: z.string().optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Handle GET request to list programs
  if (req.method === 'GET') {
    // Query parameters for filtering
    const { department, degree, search } = req.query;
    
    let filteredPrograms = [...mockPrograms];
    
    // Apply filters
    if (department) {
      filteredPrograms = filteredPrograms.filter(
        program => program.departmentId === department || program.department.toLowerCase() === String(department).toLowerCase()
      );
    }
    
    if (degree) {
      filteredPrograms = filteredPrograms.filter(
        program => program.degree.toLowerCase() === String(degree).toLowerCase()
      );
    }
    
    if (search) {
      const searchTerm = String(search).toLowerCase();
      filteredPrograms = filteredPrograms.filter(
        program => 
          program.name.toLowerCase().includes(searchTerm) ||
          program.code.toLowerCase().includes(searchTerm) ||
          program.description?.toLowerCase().includes(searchTerm)
      );
    }
    
    return res.status(200).json({
      success: true,
      data: filteredPrograms
    });
  }
  
  // Handle POST request to create a new program
  if (req.method === 'POST') {
    try {
      // Validate request body
      const validatedData = createProgramSchema.parse(req.body);
      
      // Check if code already exists
      const codeExists = mockPrograms.some(
        prog => prog.code.toLowerCase() === validatedData.code.toLowerCase()
      );
      
      if (codeExists) {
        return res.status(400).json({
          success: false,
          message: 'Program code already exists'
        });
      }
      
      // Create new program object
      const newProgram = {
        id: `prog-${Date.now()}`,
        ...validatedData,
        department: 'Mock Department', // In a real app, get from department service
        studentCount: 0,
        createdAt: new Date().toISOString().split('T')[0]
      };
      
      // In a real application, save to database
      // For demo, just return the created program
      
      return res.status(201).json({
        success: true,
        message: 'Program created successfully',
        data: newProgram
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      
      console.error('Program creation error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Internal server error' 
      });
    }
  }
  
  // Return 405 for other methods
  return res.status(405).json({ success: false, message: 'Method not allowed' });
}
