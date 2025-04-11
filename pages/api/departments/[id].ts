import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  const departmentId = String(id);

  // GET: Fetch a specific department
  if (req.method === 'GET') {
    try {
      const department = await prisma.department.findUnique({
        where: { id: departmentId },
        include: {
          head: {
            include: {
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
          teachers: {
            include: {
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
          students: {
            include: {
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
          courses: true,
        },
      });

      if (!department) {
        return res.status(404).json({ error: 'Department not found' });
      }

      return res.status(200).json({ success: true, data: department });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to fetch department' });
    }
  }

  // PUT: Update a department
  if (req.method === 'PUT') {
    try {
      const { name, code, description, headId } = req.body;

      const updatedDepartment = await prisma.department.update({
        where: { id: departmentId },
        data: {
          name,
          code,
          description,
          headId,
        },
      });

      return res.status(200).json({ success: true, data: updatedDepartment });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to update department' });
    }
  }

  // DELETE: Remove a department
  if (req.method === 'DELETE') {
    try {
      await prisma.department.delete({
        where: { id: departmentId },
      });

      return res.status(200).json({
        success: true,
        message: 'Department deleted successfully',
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to delete department' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
