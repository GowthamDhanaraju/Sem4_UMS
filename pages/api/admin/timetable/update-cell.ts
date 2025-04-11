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
    const { class: className, day, timeSlot, subject } = req.body;

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

    // Get the course and a teacher for it
    const course = await prisma.course.findUnique({
      where: { id: subject }
    });

    if (!course) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    // Find a teacher for this course
    const teacherCourse = await prisma.teacherCourse.findFirst({
      where: { courseId: course.id }
    });

    if (!teacherCourse) {
      return res.status(404).json({ message: 'No teacher found for this subject' });
    }

    // Check if a schedule already exists for this slot
    const existingSchedule = await prisma.schedule.findFirst({
      where: {
        day,
        timeSlotId: dbTimeSlot.id,
        sectionId: section.id,
        academicYearId: activeYear.id
      }
    });

    if (existingSchedule) {
      // Update existing schedule
      await prisma.schedule.update({
        where: { id: existingSchedule.id },
        data: {
          courseId: course.id,
          teacherId: teacherCourse.teacherId,
          semester: course.semester
        }
      });
    } else {
      // Create new schedule
      await prisma.schedule.create({
        data: {
          day,
          timeSlotId: dbTimeSlot.id,
          sectionId: section.id,
          courseId: course.id,
          teacherId: teacherCourse.teacherId,
          academicYearId: activeYear.id,
          semester: course.semester,
          roomNumber: `R${Math.floor(Math.random() * 500) + 100}`, // Random room number
          type: 'LECTURE',
          isBreak: false
        }
      });
    }

    return res.status(200).json({ message: 'Timetable updated successfully' });
  } catch (error) {
    console.error('Error updating timetable:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
