import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { verifyToken } from '../../../lib/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Authentication check
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: Missing or invalid token format' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }

    // Get student ID from the URL
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'Student ID is required' });
    }

    // Authorization check - only allow access to own profile or by admin/teacher
    if (decoded.role !== 'ADMIN' && decoded.role !== 'TEACHER' && decoded.id !== id) {
      return res.status(403).json({ message: 'Forbidden: You can only view your own profile' });
    }

    // Get student data
    const student = await prisma.student.findFirst({
      where: {
        OR: [
          { id: id },
          { userId: id }
        ]
      },
      include: {
        department: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    return res.status(200).json(student);
  } catch (error) {
    console.error('Error fetching student:', error);
    return res.status(500).json({ message: 'An error occurred while fetching student data' });
  }
}
