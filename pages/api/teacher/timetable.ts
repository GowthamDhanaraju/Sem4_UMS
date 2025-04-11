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
  
  if (!decoded || decoded.role !== 'TEACHER') {
    return res.status(401).json({ 
      success: false, 
      message: 'Unauthorized access' 
    });
  }

  try {
    // Find teacher by user ID
    const teacher = await prisma.teacher.findFirst({
      where: {
        userId: decoded.id
      }
    });

    if (!teacher) {
      return res.status(404).json({ 
        success: false, 
        message: 'Teacher not found' 
      });
    }

    // In a real application, you would fetch the schedule from a database
    // This is a placeholder implementation with sample data
    
    // Get teacher's courses
    const teacherCourses = await prisma.teacherCourse.findMany({
      where: {
        teacherId: teacher.id
      },
      include: {
        course: true
      }
    });

    // Generate timetable entries based on courses
    // This is a simplified version - in a real application you would have a proper schedule model
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const timeSlots = [
      "9:00 - 9:50", "10:00 - 10:50", "11:00 - 11:50",
      "12:00 - 12:50", "1:00 - 1:50", "2:00 - 2:50",
      "3:00 - 3:50", "4:00 - 4:50"
    ];
    
    // Generate sample timetable entries
    const timetableEntries = [];
    const courseTypes = ["lecture", "lab", "tutorial"];
    const classNames = ["CSE-A", "CSE-B", "CSE-C", "ECE-A", "ECE-B"];
    const rooms = ["Room 101", "Room 102", "Lab 1", "Lab 2", "Tutorial Room 1"];
    
    // Assign courses to different time slots and days
    teacherCourses.forEach((teacherCourse, index) => {
      // Assign each course to 2-3 different time slots in a week
      const slots = 2 + Math.floor(Math.random() * 2); // 2-3 slots
      
      for (let i = 0; i < slots; i++) {
        // Pick a random day and time slot (avoiding conflicts)
        const day = days[Math.floor(Math.random() * days.length)];
        
        // Skip lunch break time slot (1:00 - 1:50)
        let timeSlotIndex;
        do {
          timeSlotIndex = Math.floor(Math.random() * timeSlots.length);
        } while (timeSlots[timeSlotIndex] === "1:00 - 1:50");
        
        const timeSlot = timeSlots[timeSlotIndex];
        const courseType = courseTypes[Math.floor(Math.random() * courseTypes.length)];
        const className = classNames[Math.floor(Math.random() * classNames.length)];
        const room = rooms[Math.floor(Math.random() * rooms.length)];
        
        timetableEntries.push({
          id: `${teacherCourse.course.id}-${day}-${timeSlot}`,
          day: day,
          timeSlot: timeSlot,
          subject: teacherCourse.course.name,
          className: className,
          room: room,
          type: courseType
        });
      }
    });

    return res.status(200).json(timetableEntries);
  } catch (error) {
    console.error('Error fetching teacher timetable:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch timetable'
    });
  }
}
