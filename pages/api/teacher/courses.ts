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
    // In a production app, you would fetch the teacher's courses from the database
    // For now, we'll return dummy data to unblock the frontend
    const courses = [
      {
        id: "cs101",
        code: "CS101",
        name: "Introduction to Programming",
        sections: ["CSE-A", "CSE-B"],
        students: 45
      },
      {
        id: "cs202",
        code: "CS202",
        name: "Data Structures",
        sections: ["CSE-A"],
        students: 38
      },
      {
        id: "cs303",
        code: "CS303",
        name: "Database Systems",
        sections: ["CSE-C"],
        students: 42
      },
      {
        id: "ai401",
        code: "AI401",
        name: "Artificial Intelligence",
        sections: ["AID-A"],
        students: 35
      }
    ];

    return res.status(200).json(courses);
  } catch (error) {
    console.error('Error fetching teacher courses:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch courses'
    });
  }
}
