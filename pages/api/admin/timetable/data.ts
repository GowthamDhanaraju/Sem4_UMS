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
    const { class: className } = req.query;
    
    if (!className || typeof className !== 'string') {
      return res.status(400).json({ message: 'Class parameter is required' });
    }

    // Parse the class name format "DepartmentCode-Batch-SectionName"
    const [deptCode, batch, sectionName] = className.split('-');

    if (!deptCode || !batch || !sectionName) {
      return res.status(400).json({ message: 'Invalid class format' });
    }

    // Get the department ID from department code
    const department = await prisma.department.findFirst({
      where: { code: deptCode }
    });

    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Get the section
    const section = await prisma.section.findFirst({
      where: {
        name: sectionName,
        batch,
        departmentId: department.id
      }
    });

    if (!section) {
      return res.status(404).json({ message: 'Section not found' });
    }

    // Get active academic year
    const activeYear = await prisma.academicYear.findFirst({
      where: { isActive: true }
    });

    if (!activeYear) {
      return res.status(404).json({ message: 'No active academic year found' });
    }

    // Fetch schedules for this section in the active academic year
    const schedules = await prisma.schedule.findMany({
      where: {
        sectionId: section.id,
        academicYearId: activeYear.id
      },
      include: {
        course: true,
        teacher: true,
        timeSlot: true
      }
    });

    // Format the data for the timetable
    const timetableData = schedules.map(schedule => ({
      day: schedule.day,
      timeSlot: `${schedule.timeSlot.startTime} - ${schedule.timeSlot.endTime}`,
      subject: schedule.course.id,
      faculty: schedule.teacher.name
    }));

    return res.status(200).json(timetableData);
  } catch (error) {
    console.error('Error fetching timetable data:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
