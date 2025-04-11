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
  },
  {
    id: 'faculty-003',
    facultyId: 'F100125',
    name: 'Emily Carter',
    email: 'ecarter@university.edu',
    department: 'Physics',
    position: 'Assistant Professor',
    specialization: 'Quantum Mechanics, Thermodynamics',
    officeLocation: 'Physics Building, Room 305',
    officeHours: 'Wednesday, Friday 13:00-15:00',
    contactNumber: '+1122889900',
    hireDate: '2020-06-01',
    status: 'active',
    courses: ['course-003']
  }
];

// Faculty creation schema
const createFacultySchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required'),
  department: z.string().min(1, 'Department is required'),
  position: z.string().min(1, 'Position is required'),
  specialization: z.string().optional(),
  officeLocation: z.string().optional(),
  officeHours: z.string().optional(),
  contactNumber: z.string().optional(),
  hireDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Hire date must be in YYYY-MM-DD format').optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Handle GET request to list faculty members
  if (req.method === 'GET') {
    // Query parameters for filtering
    const { department, position, search } = req.query;
    
    let filteredFaculty = [...mockFaculty];
    
    // Apply filters
    if (department) {
      filteredFaculty = filteredFaculty.filter(
        faculty => faculty.department.toLowerCase() === String(department).toLowerCase()
      );
    }
    
    if (position) {
      filteredFaculty = filteredFaculty.filter(
        faculty => faculty.position.toLowerCase() === String(position).toLowerCase()
      );
    }
    
    if (search) {
      const searchTerm = String(search).toLowerCase();
      filteredFaculty = filteredFaculty.filter(
        faculty => 
          faculty.name.toLowerCase().includes(searchTerm) ||
          faculty.email.toLowerCase().includes(searchTerm) ||
          faculty.specialization?.toLowerCase().includes(searchTerm) ||
          faculty.facultyId.toLowerCase().includes(searchTerm)
      );
    }
    
    return res.status(200).json({
      success: true,
      data: filteredFaculty
    });
  }
  
  // Handle POST request to create a new faculty member
  if (req.method === 'POST') {
    try {
      // Validate request body
      const validatedData = createFacultySchema.parse(req.body);
      
      // Generate faculty ID (in a real app, this would follow university's pattern)
      const facultyId = `F${100000 + Math.floor(Math.random() * 900000)}`;
      
      // Create new faculty object
      const newFaculty = {
        id: `faculty-${Date.now()}`,
        facultyId,
        ...validatedData,
        status: 'active',
        courses: []
      };
      
      // In a real application, save to database
      // For demo, just return the created faculty member
      
      return res.status(201).json({
        success: true,
        message: 'Faculty member created successfully',
        data: newFaculty
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      
      console.error('Faculty creation error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Internal server error' 
      });
    }
  }
  
  // Return 405 for other methods
  return res.status(405).json({ success: false, message: 'Method not allowed' });
}
