import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import bcrypt from 'bcryptjs';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const teachers = await prisma.teacher.findMany({
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      return res.status(200).json({
        success: true,
        data: teachers,
      });
    } catch (error) {
      console.error('Error fetching teachers:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  } else if (req.method === 'POST') {
    try {
      const { name, email, password, department, subjects, phone } = req.body;

      if (!name || !email || !password || !department) {
        return res.status(400).json({
          success: false,
          message: 'Required fields are missing',
        });
      }

      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'A user with this email already exists',
        });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create user and teacher in transaction
      const result = await prisma.$transaction(async (prisma) => {
        const user = await prisma.user.create({
          data: {
            name,
            email,
            password: hashedPassword,
            role: 'teacher',
          },
        });

        const teacher = await prisma.teacher.create({
          data: {
            userId: user.id,
            department,
            subjects: subjects || '',
            phone: phone || '',
          },
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        });

        return teacher;
      });

      return res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error creating teacher:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create teacher',
      });
    }
  } else {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
}
