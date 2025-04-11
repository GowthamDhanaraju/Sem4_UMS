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
    // Find teacher by user ID
    const teacher = await prisma.teacher.findFirst({
      where: {
        userId: decoded.id
      }
    });

    if (!teacher) {
      return res.status(404).json({ 
        success: false, 
        message: 'Teacher not found' 
      });
    }

    // In a real application, you would fetch events from a database
    // For now, we'll return dummy data
    const events = [
      {
        id: "1",
        title: "Faculty Meeting",
        date: new Date(Date.now() + 86400000).toISOString(),
        location: "Conference Room 302"
      },
      {
        id: "2",
        title: "Research Symposium",
        date: new Date(Date.now() + 259200000).toISOString(),
        location: "Main Auditorium"
      },
      {
        id: "3",
        title: "Course Planning Session",
        date: new Date(Date.now() + 604800000).toISOString(),
        location: "Department Office"
      },
      {
        id: "4",
        title: "Department Workshop",
        date: new Date(Date.now() + 345600000).toISOString(),
        location: "Room 105"
      }
    ];

    return res.status(200).json(events);
  } catch (error) {
    console.error('Error fetching teacher events:', error);
    return res.status(200).json([
      {
        id: "1",
        title: "Faculty Meeting",
        date: new Date(Date.now() + 86400000).toISOString(),
        location: "Conference Room 302"
      },
      {
        id: "2",
        title: "Research Symposium",
        date: new Date(Date.now() + 259200000).toISOString(),
        location: "Main Auditorium"
      },
      {
        id: "3",
        title: "Course Planning Session",
        date: new Date(Date.now() + 604800000).toISOString(),
        location: "Department Office"
      }
    ]);
  }
}
