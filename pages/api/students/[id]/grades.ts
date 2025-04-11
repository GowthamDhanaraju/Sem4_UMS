import { NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { withAuth, AuthenticatedRequest } from '../../../../lib/auth';

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ 
        success: false, 
        message: 'Method not allowed' 
      });
    }

    const { id } = req.query;
    const studentId = String(id);

    // Authorization check - allow admins, teachers, or the student themselves
    if (req.user.role !== 'ADMIN' && req.user.role !== 'TEACHER') {
      // Check if the requesting user is the same student
      const student = await prisma.student.findFirst({
        where: { userId: req.user.id }
      });
      
      if (!student || student.id !== studentId) {
        return res.status(403).json({ 
          success: false, 
          message: 'Not authorized to access these grades' 
        });
      }
    }

    // Get all enrollments for this student
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId },
      include: {
        course: true
      },
      orderBy: [
        { year: 'desc' },
        { semester: 'desc' }
      ]
    });

    if (!enrollments || enrollments.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          cgpa: 0,
          totalCredits: 0,
          semesters: []
        }
      });
    }

    // Organize enrollments by semester
    const semesterMap = new Map();
    let totalPoints = 0;
    let totalCredits = 0;

    enrollments.forEach(enrollment => {
      const key = `${enrollment.semester}-${enrollment.year}`;
      if (!semesterMap.has(key)) {
        semesterMap.set(key, {
          semester: enrollment.semester,
          year: enrollment.year,
          courses: [],
          totalCredits: 0,
          totalPoints: 0,
          gpa: 0
        });
      }

      const semesterData = semesterMap.get(key);
      
      // For completed courses with grades
      if (enrollment.status === 'Completed' && enrollment.grade && enrollment.gradePoint !== null) {
        const coursePoints = enrollment.gradePoint * enrollment.course.credits;
        semesterData.courses.push({
          code: enrollment.course.code,
          name: enrollment.course.name,
          credits: enrollment.course.credits,
          grade: enrollment.grade,
          points: coursePoints / enrollment.course.credits // normalized to per credit
        });
        
        semesterData.totalCredits += enrollment.course.credits;
        semesterData.totalPoints += coursePoints;
        
        // Update running totals for CGPA
        totalCredits += enrollment.course.credits;
        totalPoints += coursePoints;
      } else {
        // For courses still in progress
        semesterData.courses.push({
          code: enrollment.course.code,
          name: enrollment.course.name,
          credits: enrollment.course.credits,
          grade: 'In Progress',
          points: 0
        });
      }
    });

    // Calculate GPA for each semester
    const semesters = Array.from(semesterMap.values()).map(semester => {
      if (semester.totalCredits > 0) {
        semester.gpa = semester.totalPoints / semester.totalCredits;
      }
      return semester;
    });

    // Calculate CGPA
    const cgpa = totalCredits > 0 ? totalPoints / totalCredits : 0;

    return res.status(200).json({
      success: true,
      data: {
        cgpa,
        totalCredits,
        semesters
      }
    });

  } catch (error) {
    console.error('Error fetching student grades:', error);
    return res.status(500).json({ 
      success: false, 
      message: `Internal server error: ${error.message}` 
    });
  }
}

export default withAuth(handler);
