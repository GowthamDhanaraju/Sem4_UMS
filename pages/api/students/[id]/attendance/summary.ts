import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../../lib/prisma';

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

  const { id } = req.query;
  const studentId = Array.isArray(id) ? id[0] : id;

  try {
    // Get current semester's enrollments
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    // Determine current semester (1 for Spring, 2 for Fall)
    const currentSemester = currentMonth < 7 ? '1' : '2';
    
    const enrollments = await prisma.enrollment.findMany({
      where: {
        studentId: studentId as string,
        year: currentYear,
        semester: currentSemester,
      },
      include: {
        course: true,
        attendances: true,
      },
    });

    let good = 0;
    let warning = 0;
    let critical = 0;

    // Calculate attendance status for each course
    enrollments.forEach(enrollment => {
      const totalAttendances = enrollment.attendances.length;
      if (totalAttendances === 0) return;
      
      const presentCount = enrollment.attendances.filter(a => a.status === 'PRESENT').length;
      const attendancePercentage = (presentCount / totalAttendances) * 100;
      
      if (attendancePercentage >= 75) {
        good++;
      } else if (attendancePercentage >= 60) {
        warning++;
      } else {
        critical++;
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        good,
        warning,
        critical
      }
    });
  } catch (error) {
    console.error('Error fetching attendance summary:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch attendance summary' 
    });
  }
}
