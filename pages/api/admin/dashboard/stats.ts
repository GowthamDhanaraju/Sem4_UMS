import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Example of fetching dashboard statistics
    const studentsCount = await prisma.user.count({
      where: { role: 'STUDENT' },
    });

    const teachersCount = await prisma.user.count({
      where: { role: 'TEACHER' },
    });

    // Add more statistics as needed
    const stats = {
      students: studentsCount,
      teachers: teachersCount,
      // Add more data here
    };

    return res.status(200).json(stats);
  } catch (error) {
    console.error('Error fetching dashboard statistics:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
