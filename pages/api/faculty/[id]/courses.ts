import type { NextApiRequest, NextApiResponse } from 'next';

// Mock courses data
const mockCourses = [
  {
    id: 'course-001',
    code: 'CS101',
    title: 'Introduction to Computer Science',
    credits: 4,
    department: 'Computer Science',
    description: 'Fundamentals of programming and algorithmic thinking',
    instructorId: 'faculty-001',
    instructorName: 'Jane Professor',
    semester: 'Fall 2023',
    enrolledStudents: 45,
    maxCapacity: 60,
    schedule: 'Mon, Wed, Fri 10:00 AM - 11:15 AM',
    location: 'Engineering Building, Room 302'
  },
  {
    id: 'course-002',
    code: 'MATH201',
    title: 'Calculus I',
    credits: 4,
    department: 'Mathematics',
    description: 'Limits, derivatives, and integrals of algebraic and transcendental functions',
    instructorId: 'faculty-002',
    instructorName: 'Robert Johnson',
    semester: 'Fall 2023',
    enrolledStudents: 55,
    maxCapacity: 60,
    schedule: 'Tue, Thu 2:00 PM - 3:45 PM',
    location: 'Science Hall, Room 105'
  },
  {
    id: 'course-003',
    code: 'CS202',
    title: 'Data Structures',
    credits: 3,
    department: 'Computer Science',
    description: 'Implementation and analysis of basic data structures',
    instructorId: 'faculty-001',
    instructorName: 'Jane Professor',
    semester: 'Spring 2024',
    enrolledStudents: 35,
    maxCapacity: 50,
    schedule: 'Tue, Thu 9:00 AM - 10:30 AM',
    location: 'Engineering Building, Room 308'
  }
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET method
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { id, semester } = req.query;
  const facultyId = Array.isArray(id) ? id[0] : id;
  
  // Find courses taught by the faculty member
  let facultyCourses = mockCourses.filter(course => course.instructorId === facultyId);
  
  // Filter by semester if provided
  if (semester) {
    facultyCourses = facultyCourses.filter(
      course => course.semester.toLowerCase() === String(semester).toLowerCase()
    );
  }
  
  // If no courses found
  if (facultyCourses.length === 0) {
    return res.status(200).json({
      success: true,
      message: 'No courses found for this faculty member',
      data: []
    });
  }
  
  return res.status(200).json({
    success: true,
    data: facultyCourses
  });
}
