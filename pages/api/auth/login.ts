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
      return res.status(401).json({ message: 'Invalid credentials' });
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
      const student = await prisma.student.findFirst({
        where: { userId: user.id },
        include: { department: true }
      });
      
      if (student) {
        roleSpecificData = {
          studentId: student.studentId,
          department: student.department?.name || '',
          semester: student.semester
        };
      }
    } else if (user.role === 'TEACHER') {
      const teacher = await prisma.teacher.findFirst({
        where: { userId: user.id },
        include: { department: true }
      });
      
      if (teacher) {
        roleSpecificData = {
          teacherId: teacher.teacherId,
          department: teacher.department?.name || '',
          designation: teacher.designation
        };
      }
    } else if (user.role === 'ADMIN') {
      const admin = await prisma.admin.findFirst({
        where: { userId: user.id }
      });
      
      if (admin) {
        roleSpecificData = {
          adminId: admin.adminId
        };
      }
    }

    return res.status(200).json({
      token,
      role: user.role.toLowerCase(),
      userId: user.id,
      userName: user.name,
      email: user.email,
      ...roleSpecificData
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
