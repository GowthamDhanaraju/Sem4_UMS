import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get all courses with their teachers
    const courses = await prisma.course.findMany({
      include: {
        teacherCourses: {
          include: {
            teacher: true
          }
        }
      }
    });

    // Format the subjects with their faculty information
    const subjects = courses.map(course => {
      // Get a teacher for this course if available
      const teacherCourse = course.teacherCourses[0];
      const faculty = teacherCourse ? teacherCourse.teacher.name : 'Unassigned';
      
      return {
        id: course.id,
        name: `${course.code}: ${course.name}`,
        faculty
      };
    });

    return res.status(200).json(subjects);
  } catch (error) {
    console.error('Error fetching subjects:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
