import { PrismaClient, Role, Day, ScheduleType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');
  
  // Ensure database schema is up to date
  console.log('Ensuring database schema is up to date...');
  try {
    // This is a way to push the schema to the database if it doesn't exist yet
    // Note: In production, you would typically use migrations instead
    await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "_prisma_migrations" (id TEXT PRIMARY KEY)`;
  } catch (error) {
    console.log('Schema setup error (can be ignored if tables already exist):', error);
  }
  
  // Clear existing data
  await clearDatabase();
  
  // Create departments
  console.log('Creating departments...');
  const departments = await createDepartments();
  
  // Create admin users
  console.log('Creating admin users...');
  const admins = await createAdmins();
  
  // Create teachers (3 per department)
  console.log('Creating teachers...');
  const teachers = await createTeachers(departments);
  
  // Create students (5 per department)
  console.log('Creating students...');
  const students = await createStudents(departments);
  
  // Create courses (5 per department)
  console.log('Creating courses...');
  const courses = await createCourses(departments);
  
  // Create sections (2 per department)
  console.log('Creating sections...');
  const sections = await createSections(departments);
  
  // Create time slots
  console.log('Creating time slots...');
  const timeSlots = await createTimeSlots();
  
  // Create academic year
  console.log('Creating academic years...');
  const academicYears = await createAcademicYears();
  
  // Assign teachers to courses
  console.log('Assigning teachers to courses...');
  await assignTeachersToCourses(teachers, courses);
  
  // Enroll students in courses
  console.log('Enrolling students in courses...');
  await enrollStudentsInCourses(students, courses);
  
  // Create attendance records
  console.log('Creating attendance records...');
  await createAttendanceRecords(students, courses);
  
  // Create schedules
  console.log('Creating schedules...');
  await createSchedules(courses, sections, teachers, timeSlots, academicYears);
  
  // Create books
  console.log('Creating library books...');
  const books = await createBooks();
  
  // Create borrowed books
  console.log('Creating borrowed books records...');
  await createBorrowedBooks(students, books);
  
  // Create auditoriums
  console.log('Creating auditoriums...');
  const auditoriums = await createAuditoriums();
  
  // Create auditorium bookings
  console.log('Creating auditorium bookings...');
  await createAuditoriumBookings(teachers, auditoriums);
  
  // Create feedback
  console.log('Creating student feedback...');
  await createFeedback(students, teachers, courses);
  
  console.log('Seeding completed successfully!');
  
}

async function clearDatabase() {
  console.log('Starting database cleanup...');
  
  // Helper function to safely delete records from a table
  async function safeDelete(table: string, deleteFunction: () => Promise<any>) {
    try {
      await deleteFunction();
      console.log(`Cleared ${table} table.`);
    } catch (error: any) {
      if (error.code === 'P2021') {
        console.log(`Table ${table} does not exist yet. Skipping.`);
      } else {
        console.error(`Error clearing ${table} table:`, error);
      }
    }
  }

  // Delete in reverse order of dependencies to avoid constraint errors
  await safeDelete('Schedule', () => prisma.schedule.deleteMany());
  await safeDelete('Feedback', () => prisma.feedback.deleteMany());
  await safeDelete('Attendance', () => prisma.attendance.deleteMany());
  await safeDelete('BorrowedBook', () => prisma.borrowedBook.deleteMany());
  await safeDelete('Book', () => prisma.book.deleteMany());
  await safeDelete('AuditoriumBooking', () => prisma.auditoriumBooking.deleteMany());
  await safeDelete('AvailabilitySlot', () => prisma.availabilitySlot.deleteMany());
  await safeDelete('Auditorium', () => prisma.auditorium.deleteMany());
  await safeDelete('TeacherCourse', () => prisma.teacherCourse.deleteMany());
  await safeDelete('Enrollment', () => prisma.enrollment.deleteMany());
  await safeDelete('TimeSlot', () => prisma.timeSlot.deleteMany());
  await safeDelete('AcademicYear', () => prisma.academicYear.deleteMany());
  await safeDelete('Section', () => prisma.section.deleteMany());
  await safeDelete('Course', () => prisma.course.deleteMany());
  await safeDelete('Student', () => prisma.student.deleteMany());
  await safeDelete('Teacher', () => prisma.teacher.deleteMany());
  await safeDelete('Admin', () => prisma.admin.deleteMany());
  await safeDelete('Department', () => prisma.department.deleteMany());
  await safeDelete('User', () => prisma.user.deleteMany());
  
  console.log('Database cleanup completed.');
}

async function createDepartments() {
  const departmentsData = [
    { name: 'Computer Science & Engineering', code: 'CSE' },
    { name: 'Electronics & Communication', code: 'ECE' },
    { name: 'Mechanical Engineering', code: 'ME' },
    { name: 'Civil Engineering', code: 'CE' },
    { name: 'Electrical Engineering', code: 'EE' },
    { name: 'Information Technology', code: 'IT' },
    { name: 'Artificial Intelligence & Data Science', code: 'AIDS' },
  ];
  
  const departments = [];
  
  for (const deptData of departmentsData) {
    const department = await prisma.department.create({
      data: deptData
    });
    departments.push(department);
  }
  
  return departments;
}

async function createAdmins() {
  const adminPassword = await bcrypt.hash('admin123', 10);
  
  const admins = [];
  
  for (let i = 1; i <= 5; i++) {
    const admin = await prisma.user.create({
      data: {
        name: `Admin User ${i}`,
        email: `admin${i}@university.edu`,
        password: adminPassword,
        role: Role.ADMIN,
        admin: {
          create: {
            name: `Admin User ${i}`,
            adminId: `A${String(i).padStart(3, '0')}`,
          },
        },
      },
      include: {
        admin: true,
      },
    });
    
    admins.push(admin);
  }
  
  return admins;
}

async function createTeachers(departments) {
  const teacherPassword = await bcrypt.hash('teacher123', 10);
  const designations = ['Assistant Professor', 'Associate Professor', 'Professor'];
  const teachers = [];
  let teacherIdCounter = 1;
  
  for (const department of departments) {
    // Create 3 teachers per department
    for (let i = 0; i < 3; i++) {
      const teacherId = `T${String(teacherIdCounter).padStart(3, '0')}`;
      teacherIdCounter++;
      
      const designation = designations[Math.floor(Math.random() * designations.length)];
      const specialization = getSpecializationByDepartment(department.code);
      
      const teacher = await prisma.user.create({
        data: {
          name: `${department.code} Teacher ${i + 1}`,
          email: `${department.code.toLowerCase()}.teacher${i + 1}@university.edu`,
          password: teacherPassword,
          role: Role.TEACHER,
          teacher: {
            create: {
              name: `${department.code} Teacher ${i + 1}`,
              teacherId: teacherId,
              departmentId: department.id,
              dob: new Date(1970 + Math.floor(Math.random() * 30), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
              gender: Math.random() > 0.5 ? 'M' : 'F',
              designation: designation,
              specialization: specialization,
              joinDate: new Date(2010 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
              contact: `9${Math.floor(Math.random() * 9000000000) + 1000000000}`,
              professional: {
                education: [
                  { degree: 'Ph.D', institution: 'Top University', year: 2010 - Math.floor(Math.random() * 5) },
                  { degree: 'M.Tech', institution: 'Good University', year: 2005 - Math.floor(Math.random() * 5) },
                ],
                experience: [
                  { position: designation, institution: 'Previous University', years: `${2010 - Math.floor(Math.random() * 5)} - ${2015}` }
                ],
                publications: Math.floor(Math.random() * 20) + 5
              }
            },
          },
        },
        include: {
          teacher: true,
        },
      });
      
      teachers.push(teacher);
    }
  }
  
  return teachers;
}

function getSpecializationByDepartment(deptCode) {
  const specializations = {
    'CSE': ['Machine Learning', 'Computer Networks', 'Database Systems', 'Algorithms', 'Software Engineering'],
    'ECE': ['Communication Systems', 'Microelectronics', 'Signal Processing', 'VLSI Design', 'Control Systems'],
    'ME': ['Thermodynamics', 'Manufacturing', 'Robotics', 'Fluid Mechanics', 'Material Science'],
    'CE': ['Structural Engineering', 'Geotechnical Engineering', 'Transportation', 'Environmental Engineering', 'Construction Management'],
    'EE': ['Power Systems', 'Renewable Energy', 'Control Theory', 'Electromagnetics', 'High Voltage Engineering'],
    'IT': ['Web Technologies', 'Information Security', 'Cloud Computing', 'Data Mining', 'Software Architecture'],
    'AIDS': ['Computer Vision', 'Deep Learning', 'Natural Language Processing', 'Data Analytics', 'Big Data']
  };
  
  const deptSpecializations = specializations[deptCode] || ['General Specialization'];
  return deptSpecializations[Math.floor(Math.random() * deptSpecializations.length)];
}

async function createStudents(departments) {
  const studentPassword = await bcrypt.hash('student123', 10);
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const students = [];
  let studentIdCounter = 1;
  
  for (const department of departments) {
    // Create 5 students per department
    for (let i = 0; i < 5; i++) {
      const studentId = `S${String(studentIdCounter).padStart(3, '0')}`;
      studentIdCounter++;
      
      const batch = `${2020 + Math.floor(Math.random() * 4)}`;
      const joinYear = parseInt(batch);
      const currentYear = new Date().getFullYear();
      const semester = Math.min(Math.max(1, 2 * (currentYear - joinYear) + (Math.random() > 0.5 ? 1 : 2)), 8);
      
      const student = await prisma.user.create({
        data: {
          name: `${department.code} Student ${i + 1}`,
          email: `${department.code.toLowerCase()}.student${i + 1}@university.edu`,
          password: studentPassword,
          role: Role.STUDENT,
          student: {
            create: {
              name: `${department.code} Student ${i + 1}`,
              studentId: studentId,
              departmentId: department.id,
              dob: new Date(1998 + Math.floor(Math.random() * 7), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
              gender: Math.random() > 0.5 ? 'M' : 'F',
              batch: batch,
              semester: semester,
              joinDate: new Date(joinYear, 7, 1), // August 1st of join year
              contact: `9${Math.floor(Math.random() * 9000000000) + 1000000000}`,
              academicInfo: {
                entryScore: Math.floor(Math.random() * 50) + 50, // 50-99
                previousEducation: {
                  school: 'High School ' + Math.floor(Math.random() * 10),
                  grade: `${Math.floor(Math.random() * 10) + 90}%`,
                  year: joinYear - 2
                },
                currentGPA: (Math.random() * 3 + 6) / 10 + 6 // 6.0-9.0
              }
            },
          },
        },
        include: {
          student: true,
        },
      });
      
      students.push(student);
    }
  }
  
  return students;
}

async function createCourses(departments) {
  const courses = [];
  let courseCounter = 1;
  
  const coursesByDept = {
    'CSE': [
      { name: 'Introduction to Programming', semester: 1 },
      { name: 'Data Structures', semester: 2 },
      { name: 'Object Oriented Programming', semester: 3 },
      { name: 'Database Management Systems', semester: 4 },
      { name: 'Operating Systems', semester: 5 },
      { name: 'Computer Networks', semester: 6 },
      { name: 'Machine Learning', semester: 7 },
      { name: 'Design and Analysis of Algorithms', semester: 3 }
    ],
    'ECE': [
      { name: 'Electronic Circuits', semester: 1 },
      { name: 'Digital Logic Design', semester: 2 },
      { name: 'Signals and Systems', semester: 3 },
      { name: 'Communication Systems', semester: 4 },
      { name: 'Digital Signal Processing', semester: 5 },
      { name: 'VLSI Design', semester: 6 },
      { name: 'Embedded Systems', semester: 7 }
    ],
    'ME': [
      { name: 'Engineering Mechanics', semester: 1 },
      { name: 'Thermodynamics', semester: 2 },
      { name: 'Fluid Mechanics', semester: 3 },
      { name: 'Manufacturing Processes', semester: 4 },
      { name: 'Heat Transfer', semester: 5 },
      { name: 'Machine Design', semester: 6 },
      { name: 'Robotics', semester: 7 }
    ],
    'CE': [
      { name: 'Engineering Surveying', semester: 1 },
      { name: 'Structural Analysis', semester: 2 },
      { name: 'Soil Mechanics', semester: 3 },
      { name: 'Reinforced Concrete Design', semester: 4 },
      { name: 'Transportation Engineering', semester: 5 },
      { name: 'Environmental Engineering',  semester: 6 },
      { name: 'Construction Management', semester: 7 }
    ],
    'EE': [
      { name: 'Electric Circuits', semester: 1 },
      { name: 'Electromagnetic Fields', semester: 2 },
      { name: 'Electrical Machines', semester: 3 },
      { name: 'Power Systems', semester: 4 },
      { name: 'Control Systems', semester: 5 },
      { name: 'Power Electronics', semester: 6 },
      { name: 'Renewable Energy Systems', semester: 7 }
    ],
    'IT': [
      { name: 'Introduction to Information Technology', semester: 1 },
      { name: 'Web Development', semester: 2 },
      { name: 'Software Engineering', semester: 3 },
      { name: 'Computer Security', semester: 4 },
      { name: 'Cloud Computing', semester: 5 },
      { name: 'Mobile App Development', semester: 6 },
      { name: 'Big Data Analytics', semester: 7 }
    ],
    'AIDS': [
      { name: 'Introduction to AI', semester: 1 },
      { name: 'Statistical Methods', semester: 2 },
      { name: 'Data Mining', semester: 3 },
      { name: 'Neural Networks', semester: 4 },
      { name: 'Deep Learning', semester: 5 },
      { name: 'Natural Language Processing', semester: 6 },
      { name: 'Computer Vision', semester: 7 }
    ]
  };
  
  for (const department of departments) {
    const deptCourses = coursesByDept[department.code] || [];
    
    // Create 5 courses for each department (or use all if fewer than 5)
    for (let i = 0; i < Math.min(deptCourses.length, 5); i++) {
      const courseData = deptCourses[i];
      const codeNumber = String(courseCounter).padStart(3, '0');
      courseCounter++;
      
      const course = await prisma.course.create({
        data: {
          code: `${department.code}${codeNumber}`,
          name: courseData.name,
          credits: Math.floor(Math.random() * 2) + 3, // 3-4 credits
          departmentId: department.id,
          semester: courseData.semester
        }
      });
      
      courses.push(course);
    }
  }
  
  return courses;
}

async function createSections(departments) {
  const sections = [];
  const batches = ['2020', '2021', '2022', '2023'];
  
  for (const department of departments) {
    // Create 2 sections for each batch in this department
    for (const batch of batches) {
      for (const sectionName of ['A', 'B']) {
        const section = await prisma.section.create({
          data: {
            name: sectionName,
            departmentId: department.id,
            batch: batch
          }
        });
        
        sections.push(section);
      }
    }
  }
  
  return sections;
}

async function createTimeSlots() {
  const slotTimes = [
    { startTime: '09:00', endTime: '09:50', name: 'Period 1' },
    { startTime: '10:00', endTime: '10:50', name: 'Period 2' },
    { startTime: '11:00', endTime: '11:50', name: 'Period 3' },
    { startTime: '12:00', endTime: '12:50', name: 'Period 4' },
    { startTime: '13:00', endTime: '13:50', name: 'Lunch Break' },
    { startTime: '14:00', endTime: '14:50', name: 'Period 5' },
    { startTime: '15:00', endTime: '15:50', name: 'Period 6' },
    { startTime: '16:00', endTime: '16:50', name: 'Period 7' },
    { startTime: '17:00', endTime: '17:50', name: 'Period 8' }
  ];
  
  const timeSlots = [];
  
  for (const slotData of slotTimes) {
    const timeSlot = await prisma.timeSlot.create({
      data: slotData
    });
    
    timeSlots.push(timeSlot);
  }
  
  return timeSlots;
}

async function createAcademicYears() {
  const academicYears = [];
  
  // Current academic year
  const currentYear = await prisma.academicYear.create({
    data: {
      name: '2023-2024',
      startDate: new Date(2023, 7, 1),  // August 1, 2023
      endDate: new Date(2024, 4, 31),   // May 31, 2024
      isActive: true
    }
  });
  academicYears.push(currentYear);
  
  // Previous academic year
  const prevYear = await prisma.academicYear.create({
    data: {
      name: '2022-2023',
      startDate: new Date(2022, 7, 1),  // August 1, 2022
      endDate: new Date(2023, 4, 31),   // May 31, 2023
      isActive: false
    }
  });
  academicYears.push(prevYear);
  
  // Next academic year
  const nextYear = await prisma.academicYear.create({
    data: {
      name: '2024-2025',
      startDate: new Date(2024, 7, 1),  // August 1, 2024
      endDate: new Date(2025, 4, 31),   // May 31, 2025
      isActive: false
    }
  });
  academicYears.push(nextYear);
  
  return academicYears;
}

async function assignTeachersToCourses(teachers, courses) {
  const teachersByCoursePrefix = {};
  
  // Group teachers by department based on course prefix
  for (const teacher of teachers) {
    const deptCode = teacher.teacher.teacherId.startsWith('T') 
      ? teacher.name.split(' ')[0] // Extract dept code from name if format is "CSE Teacher 1"
      : '';
      
    if (deptCode) {
      if (!teachersByCoursePrefix[deptCode]) {
        teachersByCoursePrefix[deptCode] = [];
      }
      teachersByCoursePrefix[deptCode].push(teacher);
    }
  }
  
  for (const course of courses) {
    // Extract department code from course code (e.g., "CSE101" -> "CSE")
    const deptPrefix = course.code.match(/^[A-Z]+/)?.[0] || '';
    const availableTeachers = teachersByCoursePrefix[deptPrefix] || [];
    
    if (availableTeachers.length > 0) {
      // Assign random teacher from same department to course
      const randomTeacher = availableTeachers[Math.floor(Math.random() * availableTeachers.length)];
      
      // Create teacher-course assignment for two sections (A and B) and current year
      await prisma.teacherCourse.create({
        data: {
          teacherId: randomTeacher.teacher.id,
          courseId: course.id,
          section: 'A',
          year: 2023,
          semester: course.semester
        }
      });
      
      await prisma.teacherCourse.create({
        data: {
          teacherId: randomTeacher.teacher.id,
          courseId: course.id,
          section: 'B',
          year: 2023,
          semester: course.semester
        }
      });
    }
  }
}

async function enrollStudentsInCourses(students, courses) {
  const studentsByCoursePrefix = {};
  
  // Group students by department based on course prefix
  for (const student of students) {
    const deptCode = student.student.studentId.startsWith('S') 
      ? student.name.split(' ')[0] // Extract dept code from name if format is "CSE Student 1"
      : '';
      
    if (deptCode) {
      if (!studentsByCoursePrefix[deptCode]) {
        studentsByCoursePrefix[deptCode] = [];
      }
      studentsByCoursePrefix[deptCode].push(student);
    }
  }
  
  for (const course of courses) {
    // Extract department code from course code (e.g., "CSE101" -> "CSE")
    const deptPrefix = course.code.match(/^[A-Z]+/)?.[0] || '';
    const deptStudents = studentsByCoursePrefix[deptPrefix] || [];
    
    if (deptStudents.length > 0) {
      // Determine which students should take this course based on semester
      const eligibleStudents = deptStudents.filter(student => {
        const studentSemester = student.student.semester;
        return studentSemester >= course.semester; // Students can take courses from their semester or earlier
      });
      
      // Enroll students in this course
      for (const student of eligibleStudents) {
        // Generate a random grade for courses in past semesters
        const studentSemester = student.student.semester;
        const isCoursePast = course.semester < studentSemester;
        
        const grades = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'];
        const gradePointMap: Record<string, number> = {
          'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7, 
          'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D': 1.0, 'F': 0.0
        };
        
        const randomGrade = grades[Math.floor(Math.random() * (grades.length - 1))]; // Avoid too many F's
        const gradePoint = gradePointMap[randomGrade];
        
        await prisma.enrollment.create({
          data: {
            studentId: student.student.id,
            courseId: course.id,
            year: 2023,
            semester: course.semester,
            status: isCoursePast ? 'Completed' : 'In Progress',
            grade: isCoursePast ? randomGrade : null,
            gradePoint: isCoursePast ? gradePoint : null
          }
        });
      }
    }
  }
}

async function createAttendanceRecords(students, courses) {
  // Create attendance records for the last 30 days
  const today = new Date();
  const dates = [];
  
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Skip weekends
    if (date.getDay() !== 0 && date.getDay() !== 6) {
      dates.push(date);
    }
  }
  
  // Get enrollments
  const enrollments = await prisma.enrollment.findMany({
    where: {
      status: 'In Progress',
    },
    include: {
      student: true,
      course: true,
    },
  });
  
  // Create attendance records for each enrollment and date
  for (const enrollment of enrollments) {
    for (const date of dates) {
      // Skip if weekend or random skip
      if (date.getDay() === 0 || date.getDay() === 6 || Math.random() < 0.1) {
        continue;
      }
      
      // Choose attendance status
      let status = 'present';
      let note = null;
      const rand = Math.random();
      
      if (rand < 0.05) {
        status = 'medical';
        note = 'Medical leave with certificate';
      } else if (rand < 0.1) {
        status = 'dutyLeave';
        note = 'Leave for university duty';
      } else if (rand < 0.2) {
        status = 'absent';
        note = 'Absent without notification';
      }
      
      await prisma.attendance.create({
        data: {
          studentId: enrollment.studentId,
          courseId: enrollment.courseId,
          date: date,
          status: status,
          note: note
        }
      });
    }
  }
}

async function createSchedules(courses, sections, teachers, timeSlots, academicYears) {
  const days: Day[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
  const scheduleTypes: ScheduleType[] = ['LECTURE', 'LAB', 'TUTORIAL'];
  const activeYear = academicYears.find(year => year.isActive);
  
  if (!activeYear) return;
  
  // Get teacher courses
  const teacherCourses = await prisma.teacherCourse.findMany({
    include: {
      course: true,
      teacher: true
    }
  });
  
  for (const teacherCourse of teacherCourses) {
    // Find matching section
    const matchingSection = sections.find(
      section => section.name === teacherCourse.section && 
                section.departmentId === teacherCourse.course.departmentId
    );
    
    if (!matchingSection) continue;
    
    // Create primary lecture slots (2 per week)
    const randomDay1 = days[Math.floor(Math.random() * days.length)];
    let randomDay2 = days[Math.floor(Math.random() * days.length)];
    while (randomDay2 === randomDay1) {
      randomDay2 = days[Math.floor(Math.random() * days.length)];
    }
    
    // Filter timeSlots to exclude lunch break
    const lectureTimeSlots = timeSlots.filter(slot => !slot.name.includes('Lunch'));
    
    // Select random time slots for lectures
    const randomTimeSlot1 = lectureTimeSlots[Math.floor(Math.random() * lectureTimeSlots.length)];
    let randomTimeSlot2 = lectureTimeSlots[Math.floor(Math.random() * lectureTimeSlots.length)];
    while (randomTimeSlot2.id === randomTimeSlot1.id) {
      randomTimeSlot2 = lectureTimeSlots[Math.floor(Math.random() * lectureTimeSlots.length)];
    }
    
    // Generate random room numbers
    const roomNumber1 = `${Math.floor(Math.random() * 5) + 1}${String(Math.floor(Math.random() * 10)).padStart(2, '0')}`;
    const roomNumber2 = `${Math.floor(Math.random() * 5) + 1}${String(Math.floor(Math.random() * 10)).padStart(2, '0')}`;
    
    // Create first lecture schedule
    try {
      // Check if schedule already exists
      const existingSchedule1 = await prisma.schedule.findFirst({
        where: {
          day: randomDay1,
          timeSlotId: randomTimeSlot1.id,
          sectionId: matchingSection.id,
          academicYearId: activeYear.id,
          semester: teacherCourse.semester
        }
      });
      
      // Only create if no schedule exists
      if (!existingSchedule1) {
        await prisma.schedule.create({
          data: {
            day: randomDay1,
            timeSlotId: randomTimeSlot1.id,
            sectionId: matchingSection.id,
            courseId: teacherCourse.courseId,
            teacherId: teacherCourse.teacherId,
            academicYearId: activeYear.id,
            semester: teacherCourse.semester,
            roomNumber: roomNumber1,
            type: 'LECTURE',
            isBreak: false
          }
        });
      }
    } catch (error) {
      console.log('Skipping schedule due to conflict', error);
    }
    
    // Create second lecture schedule
    try {
      // Check if schedule already exists
      const existingSchedule2 = await prisma.schedule.findFirst({
        where: {
          day: randomDay2,
          timeSlotId: randomTimeSlot2.id,
          sectionId: matchingSection.id,
          academicYearId: activeYear.id,
          semester: teacherCourse.semester
        }
      });
      
      // Only create if no schedule exists
      if (!existingSchedule2) {
        await prisma.schedule.create({
          data: {
            day: randomDay2,
            timeSlotId: randomTimeSlot2.id,
            sectionId: matchingSection.id,
            courseId: teacherCourse.courseId,
            teacherId: teacherCourse.teacherId,
            academicYearId: activeYear.id,
            semester: teacherCourse.semester,
            roomNumber: roomNumber2,
            type: 'LECTURE',
            isBreak: false
          }
        });
      }
    } catch (error) {
      console.log('Skipping schedule due to conflict', error);
    }
    
    // Add a lab/tutorial session with 30% probability
    if (Math.random() < 0.3) {
      const randomDay3 = days[Math.floor(Math.random() * days.length)];
      const randomTimeSlot3 = lectureTimeSlots[Math.floor(Math.random() * lectureTimeSlots.length)];
      const scheduleType = Math.random() < 0.5 ? 'LAB' : 'TUTORIAL';
      const roomNumber = scheduleType === 'LAB' 
        ? `Lab ${Math.floor(Math.random() * 10) + 1}` 
        : `${Math.floor(Math.random() * 5) + 1}${String(Math.floor(Math.random() * 10)).padStart(2, '0')}`;
      
      try {
        // Check if schedule already exists
        const existingSchedule3 = await prisma.schedule.findFirst({
          where: {
            day: randomDay3,
            timeSlotId: randomTimeSlot3.id,
            sectionId: matchingSection.id,
            academicYearId: activeYear.id,
            semester: teacherCourse.semester
          }
        });
        
        // Only create if no schedule exists
        if (!existingSchedule3) {
          await prisma.schedule.create({
            data: {
              day: randomDay3,
              timeSlotId: randomTimeSlot3.id,
              sectionId: matchingSection.id,
              courseId: teacherCourse.courseId,
              teacherId: teacherCourse.teacherId,
              academicYearId: activeYear.id,
              semester: teacherCourse.semester,
              roomNumber: roomNumber,
              type: scheduleType,
              isBreak: false
            }
          });
        } else {
          console.log('Skipping lab/tutorial schedule - slot already occupied');
        }
      } catch (error) {
        console.log('Skipping lab/tutorial schedule due to conflict', error);
      }
    }
  }
}

async function createBooks() {
  const booksData = [
    { 
      title: 'Introduction to Algorithms', 
      author: 'Thomas H. Cormen', 
      category: 'Computer Science',
      isbn: '9780262033848',
      publisher: 'MIT Press',
      copies: 10,
      available: 8,
      location: 'CS Section, Shelf 1'
    },
    { 
      title: 'Database System Concepts', 
      author: 'Abraham Silberschatz', 
      category: 'Computer Science',
      isbn: '9780073523323',
      publisher: 'McGraw-Hill',
      copies: 8,
      available: 5,
      location: 'CS Section, Shelf 2'
    },
    { 
      title: 'Operating System Concepts', 
      author: 'Abraham Silberschatz', 
      category: 'Computer Science',
      isbn: '9781118063330',
      publisher: 'Wiley',
      copies: 12,
      available: 9,
      location: 'CS Section, Shelf 2'
    },
    { 
      title: 'Computer Networks', 
      author: 'Andrew S. Tanenbaum', 
      category: 'Computer Science',
      isbn: '9780132126953',
      publisher: 'Pearson',
      copies: 6,
      available: 4,
      location: 'CS Section, Shelf 3'
    },
    { 
      title: 'Artificial Intelligence: A Modern Approach', 
      author: 'Stuart Russell', 
      category: 'Computer Science',
      isbn: '9780136042594',
      publisher: 'Pearson',
      copies: 7,
      available: 6,
      location: 'CS Section, Shelf 3'
    },
    { 
      title: 'Digital Design', 
      author: 'M. Morris Mano', 
      category: 'Electronics',
      isbn: '9780132774208',
      publisher: 'Pearson',
      copies: 9,
      available: 7,
      location: 'EC Section, Shelf 1'
    },
    { 
      title: 'Signals and Systems', 
      author: 'Alan V. Oppenheim', 
      category: 'Electronics',
      isbn: '9780138147570',
      publisher: 'Pearson',
      copies: 8,
      available: 8,
      location: 'EC Section, Shelf 1'
    },
    { 
      title: 'Engineering Mechanics', 
      author: 'R.C. Hibbeler', 
      category: 'Mechanical Engineering',
      isbn: '9780133918922',
      publisher: 'Pearson',
      copies: 10,
      available: 7,
      location: 'ME Section, Shelf 1'
    },
    { 
      title: 'Fundamentals of Thermodynamics', 
      author: 'Claus Borgnakke', 
      category: 'Mechanical Engineering',
      isbn: '9781118131992',
      publisher: 'Wiley',
      copies: 6,
      available: 5,
      location: 'ME Section, Shelf 2'
    },
    { 
      title: 'Fluid Mechanics', 
      author: 'Frank M. White', 
      category: 'Mechanical Engineering',
      isbn: '9780073398273',
      publisher: 'McGraw-Hill',
      copies: 7,
      available: 6,
      location: 'ME Section, Shelf 2'
    },
    { 
      title: 'Structural Analysis', 
      author: 'R.C. Hibbeler', 
      category: 'Civil Engineering',
      isbn: '9780134610672',
      publisher: 'Pearson',
      copies: 9,
      available: 8,
      location: 'CE Section, Shelf 1'
    },
    { 
      title: 'Reinforced Concrete Design', 
      author: 'Chu-Kia Wang', 
      category: 'Civil Engineering',
      isbn: '9780471262862',
      publisher: 'Wiley',
      copies: 5,
      available: 4,
      location: 'CE Section, Shelf 2'
    },
    { 
      title: 'Electric Circuits', 
      author: 'James W. Nilsson', 
      category: 'Electrical Engineering',
      isbn: '9780133760033',
      publisher: 'Pearson',
      copies: 8,
      available: 6,
      location: 'EE Section, Shelf 1'
    },
    { 
      title: 'Power Electronics', 
      author: 'Daniel W. Hart', 
      category: 'Electrical Engineering',
      isbn: '9780073380674',
      publisher: 'McGraw-Hill',
      copies: 6,
      available: 5,
      location: 'EE Section, Shelf 2'
    },
    { 
      title: 'Web Development and Design Foundations', 
      author: 'Terry Felke-Morris', 
      category: 'Information Technology',
      isbn: '9780134801148',
      publisher: 'Pearson',
      copies: 7,
      available: 6,
      location: 'IT Section, Shelf 1'
    },
    { 
      title: 'Cloud Computing: Concepts, Technology & Architecture', 
      author: 'Thomas Erl', 
      category: 'Information Technology',
      isbn: '9780133387520',
      publisher: 'Prentice Hall',
      copies: 5,
      available: 4,
      location: 'IT Section, Shelf 2'
    },
    { 
      title: 'Deep Learning', 
      author: 'Ian Goodfellow', 
      category: 'AI & Data Science',
      isbn: '9780262035613',
      publisher: 'MIT Press',
      copies: 6,
      available: 4,
      location: 'AI Section, Shelf 1'
    },
    { 
      title: 'Pattern Recognition and Machine Learning', 
      author: 'Christopher M. Bishop', 
      category: 'AI & Data Science',
      isbn: '9780387310732',
      publisher: 'Springer',
      copies: 5,
      available: 3,
      location: 'AI Section, Shelf 1'
    },
    { 
      title: 'Neural Networks and Deep Learning', 
      author: 'Charu C. Aggarwal', 
      category: 'AI & Data Science',
      isbn: '9783319944623',
      publisher: 'Springer',
      copies: 4,
      available: 3,
      location: 'AI Section, Shelf 2'
    },
    { 
      title: 'Math for Machine Learning', 
      author: 'Marc Peter Deisenroth', 
      category: 'AI & Data Science',
      isbn: '9781108470049',
      publisher: 'Cambridge University Press',
      copies: 5,
      available: 5,
      location: 'AI Section, Shelf 2'
    }
  ];
  
  const books = [];
  
  for (const bookData of booksData) {
    const book = await prisma.book.create({
      data: bookData
    });
    
    books.push(book);
  }
  
  return books;
}

async function createBorrowedBooks(students, books) {
  // Choose 10-15 random students who have borrowed books
  const numberOfBorrowers = Math.floor(Math.random() * 6) + 10; // 10-15 borrowers
  const randomStudents = [];
  const selectedStudentIds = new Set();
  
  while (randomStudents.length < numberOfBorrowers && randomStudents.length < students.length) {
    const randomStudent = students[Math.floor(Math.random() * students.length)];
    if (!selectedStudentIds.has(randomStudent.student.id)) {
      randomStudents.push(randomStudent);
      selectedStudentIds.add(randomStudent.student.id);
    }
  }
  
  // For each student, borrow 1-3 books
  for (const student of randomStudents) {
    const numberOfBooks = Math.floor(Math.random() * 3) + 1; // 1-3 books
    const borrowedBookIds = new Set();
    
    for (let i = 0; i < numberOfBooks; i++) {
      // Select a random book that has available copies
      const availableBooks = books.filter(book => book.available > 0 && !borrowedBookIds.has(book.id));
      
      if (availableBooks.length === 0) break;
      
      const randomBook = availableBooks[Math.floor(Math.random() * availableBooks.length)];
      borrowedBookIds.add(randomBook.id);
      
      // Generate borrow and due dates
      const today = new Date();
      const borrowDate = new Date(today);
      borrowDate.setDate(borrowDate.getDate() - Math.floor(Math.random() * 20) - 1); // 1-20 days ago
      
      const dueDate = new Date(borrowDate);
      dueDate.setDate(dueDate.getDate() + 14); // Due in 14 days from borrow date
      
      // Random status
      let status = 'active';
      let returnDate = null;
      
      // 20% chance book is already returned
      if (Math.random() < 0.2) {
        status = 'returned';
        returnDate = new Date(borrowDate);
        returnDate.setDate(returnDate.getDate() + Math.floor(Math.random() * 14)); // Returned 0-13 days after borrowing
      }
      
      await prisma.borrowedBook.create({
        data: {
          bookId: randomBook.id,
          studentId: student.student.id,
          borrowDate: borrowDate,
          dueDate: dueDate,
          returnDate: returnDate,
          status: status
        }
      });
      
      // Update book available copies if not returned
      if (status !== 'returned') {
        await prisma.book.update({
          where: { id: randomBook.id },
          data: { available: randomBook.available - 1 }
        });
      }
    }
  }
}

async function createAuditoriums() {
  const auditoriumsData = [
    {
      name: 'Main Auditorium',
      location: 'Central Campus, Building A',
      capacity: 500,
      hasWhiteboard: true,
      status: 'available',
      statusNote: 'Fully operational',
      amenities: ['Projector', 'Sound System', 'Air Conditioning', 'Stage Lighting']
    },
    {
      name: 'Engineering Hall',
      location: 'Engineering Building, 3rd Floor',
      capacity: 300,
      hasWhiteboard: true,
      status: 'available',
      statusNote: 'Fully operational',
      amenities: ['Projector', 'Sound System', 'Air Conditioning', 'Lecture Recording System']
    },
    {
      name: 'Conference Room A',
      location: 'Administration Building, 2nd Floor',
      capacity: 100,
      hasWhiteboard: true,
      status: 'available',
      statusNote: 'Fully operational',
      amenities: ['Projector', 'Video Conferencing', 'Air Conditioning']
    },
    {
      name: 'Seminar Hall',
      location: 'Library Building, Ground Floor',
      capacity: 150,
      hasWhiteboard: true,
      status: 'maintenance',
      statusNote: 'Audio system under maintenance until next week',
      amenities: ['Projector', 'Sound System', 'Air Conditioning']
    },
    {
      name: 'Open-Air Amphitheater',
      location: 'Central Campus Garden',
      capacity: 400,
      hasWhiteboard: false,
      status: 'available',
      statusNote: 'Weather dependent',
      amenities: ['Sound System', 'Stage Lighting']
    }
  ];
  
  const auditoriums = [];
  
  for (const audData of auditoriumsData) {
    const auditorium = await prisma.auditorium.create({
      data: audData
    });
    
    // Create availability slots for the next 30 days
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      
      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) {
        continue;
      }
      
      // Create slots for each time period
      const timeSlots = [
        '9:00 AM - 11:00 AM', 
        '11:30 AM - 1:30 PM', 
        '2:00 PM - 4:00 PM', 
        '4:30 PM - 6:30 PM'
      ];
      
      for (const timeSlot of timeSlots) {
        await prisma.availabilitySlot.create({
          data: {
            auditoriumId: auditorium.id,
            date: date,
            timeSlot: timeSlot,
            isAvailable: auditorium.status === 'available'
          }
        });
      }
    }
    
    auditoriums.push(auditorium);
  }
  
  return auditoriums;
}

async function createAuditoriumBookings(teachers, auditoriums) {
  const availableSlots = await prisma.availabilitySlot.findMany({
    where: { isAvailable: true },
    include: { auditorium: true }
  });
  
  if (availableSlots.length === 0 || teachers.length === 0) return;
  
  // Create 15-20 random bookings
  const numberOfBookings = Math.floor(Math.random() * 6) + 15; // 15-20 bookings
  
  for (let i = 0; i < numberOfBookings; i++) {
    // Random teacher, slot, and status
    const randomTeacher = teachers[Math.floor(Math.random() * teachers.length)];
    const randomSlot = availableSlots[Math.floor(Math.random() * availableSlots.length)];
    
    // Random status with weighted distribution
    const statusOptions = ['pending', 'approved', 'rejected', 'completed'];
    const statusWeights = [0.3, 0.4, 0.1, 0.2]; // 30% pending, 40% approved, 10% rejected, 20% completed
    
    const randomStatus = (() => {
      const rand = Math.random();
      let cumulativeWeight = 0;
      
      for (let i = 0; i < statusOptions.length; i++) {
        cumulativeWeight += statusWeights[i];
        if (rand < cumulativeWeight) {
          return statusOptions[i];
        }
      }
      
      return statusOptions[0]; // Default to pending if something goes wrong
    })();
    
    // Generate a title and description for the booking
    const eventTypes = [
      'Guest Lecture',
      'Department Meeting',
      'Workshop',
      'Seminar',
      'Student Presentation',
      'Conference',
      'Faculty Meeting',
      'Cultural Event',
      'Technical Symposium',
      'Alumni Meet'
    ];
    
    const randomEventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const randomTitle = `${randomEventType} on ${randomTeacher.teacher.specialization}`;
    const randomDescription = `This ${randomEventType.toLowerCase()} will focus on ${randomTeacher.teacher.specialization} and is organized by ${randomTeacher.name}.`;
    
    // Create the booking
    await prisma.auditoriumBooking.create({
      data: {
        title: randomTitle,
        auditoriumId: randomSlot.auditoriumId,
        teacherId: randomTeacher.teacher.id,
        date: randomSlot.date,
        timeSlot: randomSlot.timeSlot,
        description: randomDescription,
        status: randomStatus,
      }
    });
    
    // If approved or completed, mark the slot as unavailable
    if (randomStatus === 'approved' || randomStatus === 'completed') {
      await prisma.availabilitySlot.update({
        where: { id: randomSlot.id },
        data: { isAvailable: false }
      });
    }
  }
}

async function createFeedback(students, teachers, courses) {
  const courseTeacherPairs = await prisma.teacherCourse.findMany({
    include: {
      course: true,
      teacher: true,
    },
  });

  const enrollments = await prisma.enrollment.findMany({
    where: {
      status: "Completed", // Only provide feedback for completed courses
    },
    include: {
      student: true,
      course: true,
    },
  });

  // Create feedback for 30-50 random enrollments
  const numberOfFeedbacks = Math.min(
    Math.floor(Math.random() * 21) + 30,
    enrollments.length
  ); // 30-50 feedbacks but not more than enrollments
  const selectedEnrollmentIds = new Set();

  for (let i = 0; i < numberOfFeedbacks; i++) {
    // Find a random enrollment that hasn't been selected yet
    let randomEnrollment;
    let attempts = 0;

    while (attempts < 100) {
      // Prevent infinite loop
      randomEnrollment =
        enrollments[Math.floor(Math.random() * enrollments.length)];
      if (!selectedEnrollmentIds.has(randomEnrollment.id)) {
        selectedEnrollmentIds.add(randomEnrollment.id);
        break;
      }
      attempts++;
    }

    if (attempts >= 100) continue; // Skip if we couldn't find a unique enrollment

    // Find teacher for this course
    const courseTeacher = courseTeacherPairs.find(
      (ct) => ct.courseId === randomEnrollment.courseId
    );

    if (!courseTeacher) continue; // Skip if no teacher found

    // Generate random ratings
    const generateRating = () =>
      Math.floor(Math.random() * 2) + 3 + Math.random(); // 3.0-5.0 range

    const courseRating = {
      contentQuality: generateRating(),
      difficultyLevel: generateRating(),
      practicalApplication: generateRating(),
    };

    const teacherRating = {
      teachingQuality: generateRating(),
      communication: generateRating(),
      availability: generateRating(),
    };

    const overallRating =
      (courseRating.contentQuality +
        courseRating.difficultyLevel +
        courseRating.practicalApplication +
        teacherRating.teachingQuality +
        teacherRating.communication +
        teacherRating.availability) /
      6;

    // Generate a random comment
    const positiveComments = [
      "Great course! I learned a lot.",
      "The instructor was very knowledgeable and helpful.",
      "Well-structured course with good learning materials.",
      "I really enjoyed the practical aspects of this course.",
      "The instructor made complex topics easy to understand.",
      "Excellent teaching methods and engaging content.",
      "Very relevant and up-to-date information.",
      "The instructor was always available to answer questions.",
      "The assignments were challenging but very educational.",
      "I would recommend this course to other students.",
    ];

    const constructiveComments = [
      "More practical examples would be helpful.",
      "The pace was a bit fast at times.",
      "Additional reference materials would be beneficial.",
      "Some assignments were unclear.",
      "More feedback on assignments would be appreciated.",
      "The course could benefit from more interactive sessions.",
      "I would have liked more real-world applications.",
      "The grading criteria could be more transparent.",
      "More time for questions during lectures would be helpful.",
      "Lecture recordings would be useful for revision.",
    ];

    let comment = "";
    if (overallRating >= 4.5) {
      comment =
        positiveComments[Math.floor(Math.random() * positiveComments.length)];
    } else if (overallRating >= 3.5) {
      comment = `${positiveComments[Math.floor(Math.random() * positiveComments.length)]} ${
        constructiveComments[Math.floor(Math.random() * constructiveComments.length)]
      }`;
    } else {
      comment =
        constructiveComments[
          Math.floor(Math.random() * constructiveComments.length)
        ];
    }

    // Create the feedback
    await prisma.feedback.create({
      data: {
        studentId: randomEnrollment.studentId,
        teacherId: courseTeacher.teacherId,
        courseId: randomEnrollment.courseId,
        date: new Date(randomEnrollment.updatedAt),
        courseRating: courseRating,
        teacherRating: teacherRating,
        overallRating: parseFloat(overallRating.toFixed(2)),
        comments: comment,
      },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
