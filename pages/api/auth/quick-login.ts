import type { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';

// JWT secret key - in production, this would be an environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Mock user data for quick login
const mockUsers = {
  student: {
    id: 'student-001',
    name: 'John Doe',
    email: 'john.doe@university.edu',
    role: 'student'
  },
  teacher: {
    id: 'faculty-001',
    name: 'Dr. Sarah Johnson',
    email: 'sarah.johnson@university.edu',
    role: 'teacher'
  },
  admin: {
    id: 'admin-001',
    name: 'Admin User',
    email: 'admin@university.edu',
    role: 'admin'
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    const { role } = req.body;
    
    // Validate role
    if (!role || !['student', 'teacher', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified'
      });
    }
    
    // Get user data from mock data
    const userData = mockUsers[role as keyof typeof mockUsers];
    
    // Generate JWT token
    const token = jwt.sign(
      { id: userData.id, email: userData.email, role: userData.role },
      JWT_SECRET,
      { expiresIn: '1d' }
    );
    
    // Return success response with the correct format matching the main login endpoint
    return res.status(200).json({
      token,
      role: userData.role,
      userId: userData.id,
      userName: userData.name,
      userEmail: userData.email
    });
  } catch (error) {
    console.error('Quick login error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during quick login'
    });
  }
}
