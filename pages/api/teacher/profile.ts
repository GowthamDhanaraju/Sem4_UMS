import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { verifyToken } from '../../../lib/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Handle GET request
  if (req.method === 'GET') {
    try {
      // Verify JWT token from Authorization header
      const token = req.headers.authorization?.split(' ')[1];
      const decoded = verifyToken(token);
      
      if (!decoded || decoded.role !== 'TEACHER') {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Find teacher by user ID with related user info
      const teacher = await prisma.teacher.findFirst({
        where: {
          userId: decoded.id
        },
        include: {
          user: true,
          department: true
        }
      });

      if (!teacher) {
        return res.status(404).json({ message: 'Teacher not found' });
      }

      // Format the response
      const profileData = {
        name: teacher.user.name,
        email: teacher.user.email,
        facultyId: teacher.teacherId,
        dob: teacher.dateOfBirth,
        gender: teacher.gender,
        joinDate: teacher.joinDate, // Ensure joinDate is included
        contact: teacher.contact || '', // Use contact field
        department: teacher.department?.name || '',
        designation: teacher.designation || 'Professor',
        specialization: teacher.specialization || '',
        officeHours: teacher.officeHours || '9:00 AM - 5:00 PM',
        subjects: [] // This would be fetched from teacher courses
      };

      return res.status(200).json(profileData);
    } catch (error) {
      console.error('Error fetching teacher profile:', error);
      return res.status(500).json({ message: 'Failed to fetch profile' });
    }
  }
  
  // Handle PUT request for updating profile
  else if (req.method === 'PUT') {
    try {
      // Verify JWT token from Authorization header
      const token = req.headers.authorization?.split(' ')[1];
      const decoded = verifyToken(token);
      
      if (!decoded || decoded.role !== 'TEACHER') {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const {
        name,
        phone,
        address,
        designation,
        specialization,
        officeHours
      } = req.body;

      // Update user information
      await prisma.user.update({
        where: {
          id: decoded.id
        },
        data: {
          name
        }
      });

      // Update teacher information
      await prisma.teacher.update({
        where: {
          userId: decoded.id
        },
        data: {
          phone,
          address,
          designation,
          specialization,
          officeHours
        }
      });

      return res.status(200).json({ message: 'Profile updated successfully' });
    } catch (error) {
      console.error('Error updating teacher profile:', error);
      return res.status(500).json({ message: 'Failed to update profile' });
    }
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
}
