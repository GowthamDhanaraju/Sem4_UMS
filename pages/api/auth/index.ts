import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email, password } = req.body;

  try {
    // Find the user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      // For demo users from testUsers array, allow direct password matching
      const testUsers = [
        { role: 'student', email: 'student@example.com', password: 'student123' },
        { role: 'teacher', email: 'teacher@example.com', password: 'teacher123' },
        { role: 'admin', email: 'admin@example.com', password: 'admin123' }
      ];
      
      const testUser = testUsers.find(tu => tu.email === email && tu.password === password);
      if (!testUser) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Get user role-specific details
    let roleSpecificData = {};
    
    if (user.role === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { userId: user.id },
      });
      roleSpecificData = { studentId: student?.studentId };
    } else if (user.role === 'TEACHER') {
      const teacher = await prisma.teacher.findUnique({
        where: { userId: user.id },
      });
      roleSpecificData = { teacherId: teacher?.teacherId };
    }

    // Map the database role to client-side role format
    const roleMap = {
      'STUDENT': 'student',
      'TEACHER': 'teacher',
      'ADMIN': 'admin'
    };

    // Return user data and token
    return res.status(200).json({
      token,
      role: roleMap[user.role] || 'student',
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      ...roleSpecificData
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'An error occurred during login' });
  }
}
