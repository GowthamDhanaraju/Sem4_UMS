import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { verifyToken } from '../../../lib/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
  }

  // Get the token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      message: 'Unauthorized' 
    });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  
  if (!decoded || decoded.role !== 'TEACHER') {
    return res.status(401).json({ 
      success: false, 
      message: 'Unauthorized access' 
    });
  }

  try {
    const { teacherId } = req.query;
    
    // If teacherId is not provided in the query, try to get it from the token
    let teacherIdToUse = teacherId as string;
    
    if (!teacherIdToUse) {
      // Find teacher by user ID
      const teacher = await prisma.teacher.findFirst({
        where: {
          userId: decoded.id
        }
      });
      
      if (teacher) {
        teacherIdToUse = teacher.id;
      }
    }
    
    if (!teacherIdToUse) {
      return res.status(400).json({ 
        success: false, 
        message: 'Teacher ID is required' 
      });
    }

    // Count courses taught by this teacher
    const coursesCount = await prisma.teacherCourse.count({
      where: {
        teacherId: String(teacherIdToUse)
      }
    });

    return res.status(200).json({
      success: true,
      count: coursesCount
    });
  } catch (error) {
    console.error('Error fetching teacher courses count:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch courses count',
      count: 0 // Return a default count of 0 on error
    });
  }
}
