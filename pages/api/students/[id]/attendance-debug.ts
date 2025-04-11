import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
    // First, check if the student exists
    const student = await prisma.student.findUnique({
      where: {
        id: studentId as string,
      },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check if there are any attendance records in the database at all
    const totalAttendanceCount = await prisma.attendance.count();
    
    // Get all attendance records for this student
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        studentId: studentId as string,
      },
      include: {
        course: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    // If no attendance records were found, but there are records in the database,
    // let's check if this student has any enrollments
    if (attendanceRecords.length === 0) {
      const enrollments = await prisma.enrollment.findMany({
        where: {
          studentId: studentId as string,
        },
        include: {
          course: true,
        },
      });

      // If the student has enrollments but no attendance records, we need to create some
      if (enrollments.length > 0) {
        // This would be the place to seed some attendance records if needed
        // For now, let's just return diagnostic information
        return res.status(200).json({
          success: true,
          message: 'No attendance records found for this student, but student has enrollments',
          diagnosticInfo: {
            studentExists: !!student,
            studentId: student.id,
            totalAttendanceRecordsInDb: totalAttendanceCount,
            enrollmentsCount: enrollments.length,
            enrollments: enrollments.map(e => ({
              courseCode: e.course.code,
              courseName: e.course.name,
              status: e.status
            }))
          }
        });
      }

      return res.status(200).json({
        success: true,
        message: 'No attendance records or enrollments found for this student',
        data: [],
        diagnosticInfo: {
          studentExists: !!student,
          studentId: student.id,
          totalAttendanceRecordsInDb: totalAttendanceCount
        }
      });
    }

    // Process the attendance records as in the original API
    // ... (rest of the code from the original handler)
    
    // Get unique courses from attendance records
    const courseIds = [...new Set(attendanceRecords.map(record => record.courseId))];
    
    // Get section information for each course
    const teacherCourses = await prisma.teacherCourse.findMany({
      where: {
        courseId: { in: courseIds },
      },
    });

    // Group by semester and year based on attendance dates
    const semesterGroups = new Map();

    // Function to determine semester and year from date
    const getSemesterInfo = (date: Date) => {
      const year = date.getFullYear();
      // First semester: January to June, Second semester: July to December
      const semester = date.getMonth() < 6 ? 1 : 2;
      return { year, semester };
    };

    // Group attendance records by course and calculate stats
    const courseAttendanceMap = new Map();
    
    attendanceRecords.forEach(record => {
      const { year, semester } = getSemesterInfo(record.date);
      const key = `${semester}-${year}`;
      
      if (!semesterGroups.has(key)) {
        semesterGroups.set(key, {
          semester: semester,
          year: year,
          courses: []
        });
      }
      
      // Create entry for course if it doesn't exist
      const courseKey = `${key}-${record.courseId}`;
      if (!courseAttendanceMap.has(courseKey)) {
        // Find section for this course
        const teacherCourse = teacherCourses.find(tc => tc.courseId === record.courseId);
        
        courseAttendanceMap.set(courseKey, {
          id: record.courseId,
          code: record.course.code,
          name: record.course.name,
          section: teacherCourse?.section || 'A',
          records: [],
          present: 0,
          absent: 0,
          medical: 0,
          dutyLeave: 0,
          totalClasses: 0
        });
      }
      
      // Add record to course attendance
      const courseAttendance = courseAttendanceMap.get(courseKey);
      courseAttendance.records.push({
        date: record.date.toISOString(),
        status: record.status,
        note: record.note || ''
      });
      
      courseAttendance.totalClasses++;
      
      // Update counters based on status - make case insensitive
      const status = record.status.toUpperCase();
      if (status === 'PRESENT') courseAttendance.present++;
      else if (status === 'ABSENT') courseAttendance.absent++;
      else if (status === 'MEDICAL') courseAttendance.medical++;
      else if (status === 'DUTYLEAVE') courseAttendance.dutyLeave++;
    });

    // Calculate attendance percentages and add courses to semester groups
    courseAttendanceMap.forEach((courseAttendance, key) => {
      const [semester, year, courseId] = key.split('-');
      
      // Calculate attendance percentage
      const { present, medical, dutyLeave, totalClasses } = courseAttendance;
      const attendancePercentage = totalClasses > 0 
        ? Math.round(((present + medical + dutyLeave) / totalClasses) * 100) 
        : 0;
      
      courseAttendance.attendancePercentage = attendancePercentage;
      
      // Sort records by date (newest first)
      courseAttendance.records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      // Add course to appropriate semester
      semesterGroups.get(`${semester}-${year}`).courses.push(courseAttendance);
    });

    // Convert Map to array for response
    const semesterData = [];
    for (const [key, value] of semesterGroups) {
      semesterData.push(value);
    }

    // Sort semesters by year and semester (most recent first)
    semesterData.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.semester - a.semester;
    });

    return res.status(200).json({
      success: true,
      data: semesterData,
      diagnosticInfo: {
        totalRecordsFound: attendanceRecords.length,
        uniqueCourses: courseIds.length
      }
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch attendance data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
