import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { class: className, day, timeSlot } = req.body;

    if (!className || !day || !timeSlot) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Parse the class name format "DepartmentCode-Batch-SectionName"
    const [deptCode, batch, sectionName] = className.split('-');

    // Get the department
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

    // Get the time slot
    const [startTime, endTime] = timeSlot.split(' - ');
    const dbTimeSlot = await prisma.timeSlot.findFirst({
      where: {
        startTime,
        endTime
      }
    });

    if (!dbTimeSlot) {
      return res.status(404).json({ message: 'Time slot not found' });
    }

    // Get active academic year
    const activeYear = await prisma.academicYear.findFirst({
      where: { isActive: true }
    });

    if (!activeYear) {
      return res.status(404).json({ message: 'No active academic year found' });
    }

    // Delete the schedule for this cell
    await prisma.schedule.deleteMany({
      where: {
        day,
        timeSlotId: dbTimeSlot.id,
        sectionId: section.id,
        academicYearId: activeYear.id
      }
    });

    return res.status(200).json({ message: 'Timetable cell cleared successfully' });
  } catch (error) {
    console.error('Error clearing timetable cell:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
