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
  
  if (!decoded) {
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid token' 
    });
  }

  try {
    // Get student info including section
    const student = await prisma.student.findFirst({
      where: { userId: decoded.id },
      include: { 
        department: true,
        enrollments: {
          where: { status: 'In Progress' },
          include: { course: true }
        }
      }
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Find the section for this student (assuming it matches department and batch)
    const section = await prisma.section.findFirst({
      where: {
        departmentId: student.departmentId,
        batch: student.batch,
        name: 'A' // Default to section A if not specified
      }
    });

    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found'
      });
    }

    // Get active academic year
    const activeYear = await prisma.academicYear.findFirst({
      where: { isActive: true }
    });

    if (!activeYear) {
      return res.status(404).json({
        success: false,
        message: 'No active academic year found'
      });
    }

    // Get enrolled course IDs for filtering schedules
    const enrolledCourseIds = student.enrollments.map(e => e.courseId);

    // Get schedules for this section, matching enrolled courses only
    const schedules = await prisma.schedule.findMany({
      where: {
        sectionId: section.id,
        academicYearId: activeYear.id,
        courseId: {
          in: enrolledCourseIds
        }
      },
      include: {
        course: true,
        teacher: true,
        timeSlot: true
      },
      orderBy: [
        { day: 'asc' },
        { timeSlot: { startTime: 'asc' } }
      ]
    });

    // Format the response data
    const scheduleByDay = {
      'MONDAY': [],
      'TUESDAY': [],
      'WEDNESDAY': [],
      'THURSDAY': [],
      'FRIDAY': []
    };

    schedules.forEach(schedule => {
      const daySchedule = {
        id: schedule.id,
        courseId: schedule.courseId,
        courseName: schedule.course.name,
        courseCode: schedule.course.code,
        teacher: schedule.teacher.name,
        roomNumber: schedule.roomNumber,
        timeSlot: `${schedule.timeSlot.startTime} - ${schedule.timeSlot.endTime}`,
        type: schedule.type
      };

      scheduleByDay[schedule.day].push(daySchedule);
    });

    // Get attendance statistics for each course
    const attendanceStats = await Promise.all(
      enrolledCourseIds.map(async (courseId) => {
        const attendanceRecords = await prisma.attendance.findMany({
          where: {
            studentId: student.id,
            courseId: courseId
          }
        });

        const course = student.enrollments.find(e => e.courseId === courseId)?.course;
        
        // Calculate attendance stats
        const total = attendanceRecords.length;
        const present = attendanceRecords.filter(record => record.status.toLowerCase() === 'present').length;
        const absent = attendanceRecords.filter(record => record.status.toLowerCase() === 'absent').length;
        const leave = total - present - absent;
        const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

        return {
          courseId,
          courseName: course?.name || '',
          courseCode: course?.code || '',
          attendance: {
            total,
            present,
            absent,
            leave,
            percentage
          }
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: {
        schedule: scheduleByDay,
        courses: student.enrollments.map(e => ({
          id: e.courseId,
          name: e.course.name,
          code: e.course.code,
          credits: e.course.credits,
          semester: e.course.semester
        })),
        attendanceStats
      }
    });
  } catch (error) {
    console.error('Error fetching student timetable:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch timetable data',
      error: error.message
    });
  }
}
