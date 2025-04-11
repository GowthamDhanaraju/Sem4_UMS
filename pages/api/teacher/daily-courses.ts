import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { verifyToken } from '../../../lib/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // Extract and verify token
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  
  const decoded = verifyToken(token);
  if (!decoded || decoded.role !== 'TEACHER') {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    // Get teacher info
    const teacher = await prisma.teacher.findFirst({
      where: { userId: decoded.id },
    });

    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    // Get today's day name (e.g., "MONDAY")
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const today = days[new Date().getDay()];
    
    // If weekend, use MONDAY as default (or respond appropriately)
    const dayToUse = (today === 'SUNDAY' || today === 'SATURDAY') ? 'MONDAY' : today;

    // Get active academic year
    const activeYear = await prisma.academicYear.findFirst({
      where: { isActive: true }
    });

    if (!activeYear) {
      return res.status(404).json({ success: false, message: 'No active academic year found' });
    }

    // Get all courses taught by this teacher today
    const todaySchedules = await prisma.schedule.findMany({
      where: {
        teacherId: teacher.id,
        day: dayToUse,
        academicYearId: activeYear.id
      },
      include: {
        course: true,
        section: true,
        timeSlot: true
      },
      orderBy: {
        timeSlot: {
          startTime: 'asc'
        }
      }
    });

    // Format the response
    const courses = todaySchedules.map(schedule => ({
      id: schedule.courseId,
      code: schedule.course.code,
      name: schedule.course.name,
      section: schedule.section.name,
      semester: schedule.semester,
      time: `${schedule.timeSlot.startTime} - ${schedule.timeSlot.endTime}`,
      room: schedule.roomNumber
    }));

    return res.status(200).json({ 
      success: true, 
      data: {
        day: dayToUse,
        courses
      }
    });
  } catch (error) {
    console.error('Error fetching teacher daily courses:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch courses',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
