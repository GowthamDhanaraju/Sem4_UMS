import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    // Check connection
    console.log('Checking database connection...');
    await prisma.$queryRaw`SELECT 1+1 AS result`;
    console.log('Database connection successful!');
    
    // Count records in each table
    const userCount = await prisma.user.count();
    const teacherCount = await prisma.teacher.count();
    const studentCount = await prisma.student.count();
    const departmentCount = await prisma.department.count();
    const courseCount = await prisma.course.count();
    const enrollmentCount = await prisma.enrollment.count();
    
    console.log('Database record counts:');
    console.log(`- Users: ${userCount}`);
    console.log(`- Teachers: ${teacherCount}`);
    console.log(`- Students: ${studentCount}`);
    console.log(`- Departments: ${departmentCount}`);
    console.log(`- Courses: ${courseCount}`);
    console.log(`- Enrollments: ${enrollmentCount}`);
    
    // Display a sample record if available
    if (userCount > 0) {
      const sampleUser = await prisma.user.findFirst();
      console.log('\nSample user:', sampleUser);
    }
  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();