import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const teacherId = req.query.id as string;
      
      if (!teacherId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Teacher ID is required' 
        });
      }
      
      // Get feedback for the specified teacher
      const feedback = await prisma.feedback.findMany({
        where: { teacherId: teacherId },
        include: {
          course: true,
          teacher: true
        },
        orderBy: { date: 'desc' }
      });
      
      // Get student information separately for each feedback entry
      const formattedFeedback = await Promise.all(feedback.map(async (item) => {
        // Determine student name, handling anonymous feedback
        let studentName = 'Anonymous Student';
        if (item.studentId) {
          // Fetch the student information separately
          const student = await prisma.student.findUnique({
            where: { id: item.studentId },
            include: {
              user: {
                select: {
                  name: true
                }
              }
            }
          });
          if (student) {
            studentName = student.name || student.user.name || 'Anonymous Student';
          }
        }
        
        return {
          id: item.id,
          subject: item.course.name,
          section: 'All Sections',
          date: item.date.toISOString().split('T')[0],
          rating: item.overallRating,
          comment: item.comments || '',
          studentId: item.studentId || '',
          studentName: studentName,
          teacherId: item.teacherId,
          courseId: item.courseId,
          courseName: item.course.name,
          courseRating: item.courseRating,
          teacherRating: item.teacherRating,
          overallRating: item.overallRating,
        };
      }));
      
      return res.status(200).json({ 
        success: true, 
        data: formattedFeedback 
      });
    } catch (error) {
      console.error('Error fetching feedback:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
  }
}
