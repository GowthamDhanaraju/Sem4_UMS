import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // GET: List all departments
  if (req.method === 'GET') {
    try {
      const departments = await prisma.department.findMany();
      return res.status(200).json({ success: true, data: departments });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to fetch departments' });
    }
  }

  // POST: Create a new department
  if (req.method === 'POST') {
    try {
      const { name, code, description, headId } = req.body;

      if (!name || !code) {
        return res.status(400).json({ error: 'Name and code are required' });
      }

      const department = await prisma.department.create({
        data: {
          name,
          code,
          description,
          headId,
        },
      });

      return res.status(201).json({ success: true, data: department });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to create department' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
