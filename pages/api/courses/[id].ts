import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  const courseId = String(id);

  // GET: Fetch a specific course
  if (req.method === 'GET') {
    try {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
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
          enrollments: {
            include: {
              student: {
                include: {
                  user: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      return res.status(200).json({ success: true, data: course });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to fetch course' });
    }
  }

  // PUT: Update a course
  if (req.method === 'PUT') {
    try {
      const { code, name, description, credits, departmentId, teacherId } = req.body;

      const updatedCourse = await prisma.course.update({
        where: { id: courseId },
        data: {
          code,
          name,
          description,
          credits: credits ? Number(credits) : undefined,
          departmentId,
          teacherId,
        },
      });

      return res.status(200).json({ success: true, data: updatedCourse });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to update course' });
    }
  }

  // DELETE: Remove a course
  if (req.method === 'DELETE') {
    try {
      await prisma.course.delete({
        where: { id: courseId },
      });

      return res.status(200).json({
        success: true,
        message: 'Course deleted successfully',
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to delete course' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
