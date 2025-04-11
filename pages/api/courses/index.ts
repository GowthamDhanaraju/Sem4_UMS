import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // GET: List all courses
  if (req.method === 'GET') {
    try {
      const courses = await prisma.course.findMany({
        include: {
          teacher: {
            select: {
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      return res.status(200).json({ success: true, data: courses });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to fetch courses' });
    }
  }

  // POST: Create a new course
  if (req.method === 'POST') {
    try {
      const { code, name, description, credits, departmentId, teacherId } = req.body;

      // Validate required fields
      if (!code || !name || !credits) {
        return res.status(400).json({ error: 'Code, name and credits are required' });
      }

      const course = await prisma.course.create({
        data: {
          code,
          name,
          description,
          credits: Number(credits),
          departmentId,
          teacherId,
        },
      });

      return res.status(201).json({ success: true, data: course });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to create course' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
