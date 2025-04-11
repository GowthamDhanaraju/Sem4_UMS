import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get all departments
    const departments = await prisma.department.findMany();
    
    // For each department, get the count of students and faculty
    const departmentStats = await Promise.all(
      departments.map(async (department) => {
        const studentCount = await prisma.student.count({
          where: { departmentId: department.id }
        });
        
        const facultyCount = await prisma.teacher.count({
          where: { departmentId: department.id }
        });
        
        return {
          name: department.name,
          studentCount,
          facultyCount
        };
      })
    );
    
    return res.status(200).json(departmentStats);
  } catch (error) {
    console.error('Error fetching department statistics:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
