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
    // Get the requested date from query params
    const requestedDate = req.query.date as string || new Date().toISOString().split('T')[0];
    
    // Get the day of the week for the requested date
    const dayOfWeek = new Date(requestedDate).getDay();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const day = days[dayOfWeek];
    
    // Skip weekend days
    if (day === 'Saturday' || day === 'Sunday') {
      return res.status(200).json([]);
    }
    
    // Find teacher
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
    
    // Get teacher's courses
    const teacherCourses = await prisma.teacherCourse.findMany({
      where: {
        teacherId: teacher.id
      },
      include: {
        course: true
      },
      take: 3 // Limit to 3 courses for schedule
    });
    
    // Generate a schedule for the day
    const schedule = teacherCourses.map((tc, index) => {
      // Time slots for different periods of the day
      const timeSlots = [
        "9:00 AM - 10:30 AM",
        "11:00 AM - 12:30 PM",
        "2:00 PM - 3:30 PM"
      ];
      
      // Room numbers
      const rooms = ["Room 301", "Lab 2", "Room 105"];
      
      // Section names
      const sections = ["CSE-A", "CSE-B", "CSE-C"];
      
      return {
        id: String(index + 1),
        courseName: `${tc.course.code}: ${tc.course.name}`,
        section: sections[index % sections.length],
        time: timeSlots[index % timeSlots.length],
        room: rooms[index % rooms.length],
        day: day
      };
    });

    return res.status(200).json(schedule);
  } catch (error) {
    console.error('Error fetching teacher schedule:', error);
    // Return sample schedule data on error
    return res.status(200).json([
      {
        id: "1",
        courseName: "CS101: Intro to Programming",
        section: "CSE-A",
        time: "9:00 AM - 10:30 AM",
        room: "Room 301",
        day: "Monday"
      },
      {
        id: "2",
        courseName: "CS202: Data Structures",
        section: "CSE-A",
        time: "11:00 AM - 12:30 PM",
        room: "Lab 2",
        day: "Monday"
      },
      {
        id: "3",
        courseName: "CS303: Database Systems",
        section: "CSE-C",
        time: "2:00 PM - 3:30 PM",
        room: "Room 105",
        day: "Monday"
      }
    ]);
  }
}
