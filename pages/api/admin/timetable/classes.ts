import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get all sections with their department info
    const sections = await prisma.section.findMany({
      include: {
        department: true,
      },
    });

    // Format the sections as "DepartmentCode-Batch-SectionName" (e.g., "CSE-2022-A")
    const classes = sections.map(section => 
      `${section.department.code}-${section.batch}-${section.name}`
    );

    // Sort classes for better organization
    classes.sort();

    return res.status(200).json(classes);
  } catch (error) {
    console.error('Error fetching classes:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
