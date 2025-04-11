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

  console.log(`Fetching attendance for student: ${studentId}`);

  try {
    // First verify if the student exists - try multiple lookup methods
    let student = null;
    
    // Try finding by ID first
    student = await prisma.student.findUnique({
      where: { id: studentId as string },
    });
    
    // If not found, try finding by studentId field
    if (!student) {
      student = await prisma.student.findUnique({
        where: { studentId: studentId as string },
      });
    }
    
    // If still not found, check if it might be the userId
    if (!student) {
      student = await prisma.student.findUnique({
        where: { userId: studentId as string },
      });
    }

    if (!student) {
      console.log(`Student with ID/studentId/userId ${studentId} not found`);
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    // For consistent behavior in the rest of the code, use the actual student.id
    const studentDbId = student.id;
    console.log(`Found student: ${student.name} (ID: ${studentDbId})`);

    // Get all attendance records for this student
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        studentId: studentDbId,
      },
      include: {
        course: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    console.log(`Found ${attendanceRecords.length} attendance records for student ${studentId}`);

    if (attendanceRecords.length === 0) {
      // If no attendance records, return empty array with success status
      console.log('No attendance records found, returning empty array');
      return res.status(200).json({
        success: true,
        data: []
      });
    }

    // Get unique courses from attendance records
    const courseIds = [...new Set(attendanceRecords.map(record => record.courseId))];
    console.log(`Student has attendance for ${courseIds.length} unique courses`);
    
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
      const courseKey = `${semester}-${year}-${record.courseId}`;
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
      
      // Update counters based on status
      const status = record.status.toUpperCase();
      if (status === 'PRESENT') courseAttendance.present++;
      else if (status === 'ABSENT') courseAttendance.absent++;
      else if (status === 'MEDICAL') courseAttendance.medical++;
      else if (status === 'DUTYLEAVE') courseAttendance.dutyLeave++;
    });

    // Calculate attendance percentages and add courses to semester groups
    courseAttendanceMap.forEach((courseAttendance, key) => {
      console.log(`Processing attendance for course key: ${key}`);
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
      const semesterKey = `${semester}-${year}`;
      if (semesterGroups.has(semesterKey)) {
        semesterGroups.get(semesterKey).courses.push(courseAttendance);
      } else {
        console.log(`Warning: Could not find semester group for key ${semesterKey}`);
      }
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

    console.log(`Returning ${semesterData.length} semesters with attendance data`);
    
    // If no records were actually processed, provide a fallback
    if (semesterData.length === 0) {
      console.log("Warning: No semester data was created despite having attendance records");
      
      // Create mock attendance data as a fallback for debugging
      // This helps identify whether the issue is with processing or with the UI
      const fallbackData = [{
        semester: 1,
        year: new Date().getFullYear(),
        courses: [{
          id: "fallback-course-1",
          code: "CSE101",
          name: "Introduction to Programming",
          section: "A",
          records: [
            { date: new Date().toISOString(), status: "PRESENT", note: "" },
            { date: new Date(Date.now() - 86400000).toISOString(), status: "ABSENT", note: "Without notification" }
          ],
          present: 1,
          absent: 1,
          medical: 0,
          dutyLeave: 0,
          totalClasses: 2,
          attendancePercentage: 50
        }]
      }];
      
      return res.status(200).json({
        success: true,
        data: fallbackData,
        message: "Using fallback data - actual records processing failed"
      });
    }

    return res.status(200).json({
      success: true,
      data: semesterData
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
