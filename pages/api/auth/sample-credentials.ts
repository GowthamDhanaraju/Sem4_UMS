import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Find one user from each role
    const studentUser = await prisma.user.findFirst({
      where: { role: 'STUDENT' },
      select: {
        email: true,
        // We don't want to expose actual hashed passwords
        // This is for demonstration purposes only
        // In a real app, you would never expose passwords
        password: true,
        role: true,
        name: true
      }
    });

    const teacherUser = await prisma.user.findFirst({
      where: { role: 'TEACHER' },
      select: {
        email: true,
        password: true,
        role: true,
        name: true
      }
    });

    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      select: {
        email: true,
        password: true,
        role: true,
        name: true
      }
    });

    // Return the users
    return res.status(200).json({
      users: [
        studentUser,
        teacherUser,
        adminUser
      ].filter(Boolean) // Filter out any nulls
    });
  } catch (error) {
    console.error('Sample credentials error:', error);
    return res.status(500).json({ 
      message: 'An error occurred while fetching sample credentials',
      error: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
}
