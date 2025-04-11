import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Get counts from database
    const studentCount = await prisma.student.count();
    const teacherCount = await prisma.teacher.count();
    const coursesCount = await prisma.course.count();
    const departmentsCount = await prisma.department.count();

    // Return the data
    return res.status(200).json({
      studentCount,
      teacherCount,
      coursesCount,
      departmentsCount
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    // Always return in JSON format even when there's an error
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch statistics',
      // Provide fallback data
      studentCount: 450,
      teacherCount: 45,
      coursesCount: 68,
      departmentsCount: 12
    });
  }
}
