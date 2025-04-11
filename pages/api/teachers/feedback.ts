import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { teacherId } = req.query;
    
    try {
      // Filter condition based on teacherId query parameter
      const whereCondition = teacherId ? { teacherId: teacherId as string } : {};
      
      // Get feedback for teachers
      const feedback = await prisma.feedback.findMany({
        where: whereCondition,
        include: {
          course: true,
          teacher: {
            include: {
              user: {
                select: {
                  name: true,
                }
              }
            }
          }
        },
        orderBy: { date: 'desc' }
      });
      
      // Format feedback response
      const formattedFeedback = await Promise.all(feedback.map(async (item) => {
        // Get student name if not anonymous
        let studentName = 'Anonymous Student';
        if (item.studentId) {
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
          courseId: item.courseId,
          courseName: item.course.name,
          studentId: item.studentId,
          studentName: studentName,
          date: item.date.toISOString().split('T')[0],
          courseRating: item.courseRating,
          teacherRating: item.teacherRating,
          overallRating: item.overallRating,
          comments: item.comments || '',
          teacherId: item.teacherId,
          teacherName: item.teacher.name || item.teacher.user?.name || 'Unknown Teacher',
        };
      }));
      
      return res.status(200).json({ success: true, data: formattedFeedback });
    } catch (error) {
      console.error('Error fetching teacher feedback:', error);
      return res.status(500).json({ success: false, message: 'Error fetching feedback data' });
    }
  } else {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
}