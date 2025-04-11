// check-seed-data.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkSeedData() {
  try {
    console.log("Checking seed data in database...");

    // Check users
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    const teacherCount = await prisma.user.count({ where: { role: 'TEACHER' } });
    const studentCount = await prisma.user.count({ where: { role: 'STUDENT' } });
    
    console.log("Users in database:");
    console.log(`- Admins: ${adminCount}`);
    console.log(`- Teachers: ${teacherCount}`);
    console.log(`- Students: ${studentCount}`);
    
    // Check departments
    const departments = await prisma.department.findMany();
    console.log(`\nDepartments (${departments.length}):`);
    departments.forEach(dept => console.log(`- ${dept.name} (${dept.code})`));
    
    // Check courses
    const courses = await prisma.course.count();
    console.log(`\nCourses: ${courses}`);
    
    // Check if specific seed data exists
    const adminUser = await prisma.user.findUnique({ 
      where: { email: 'admin@university.edu' } 
    });
    console.log(`\nAdmin user exists: ${!!adminUser}`);
    
    const cseDepartment = await prisma.department.findFirst({ 
      where: { code: 'CS' } 
    });
    console.log(`CS Department exists: ${!!cseDepartment}`);

  } catch (error) {
    console.error("Error checking seed data:", error);
  } finally {
    await prisma.$disconnect();
    console.log("\nDatabase check completed");
  }
}

// Run the function
checkSeedData();