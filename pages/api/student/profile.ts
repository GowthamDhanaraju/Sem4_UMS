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
      
      if (!decoded || decoded.role !== 'STUDENT') {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Find student by user ID with related user info
      const student = await prisma.student.findFirst({
        where: {
          userId: decoded.id
        },
        include: {
          user: true,
          department: true,
          enrollments: {
            include: {
              course: true
            }
          }
        }
      });

      if (!student) {
        return res.status(404).json({ message: 'Student not found' });
      }

      // Calculate GPA
      let totalCredits = 0;
      let totalPoints = 0;
      student.enrollments.forEach(enrollment => {
        if (enrollment.gradePoint !== null && enrollment.grade) {
          const credits = enrollment.course.credits;
          totalCredits += credits;
          totalPoints += credits * enrollment.gradePoint;
        }
      });
      
      const cgpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : 'N/A';

      // Format the response
      const profileData = {
        personal: {
          name: student.user.name,
          studentId: student.studentId,
          dob: student.dob,
          gender: student.gender,
          joinYear: new Date(student.joinDate).getFullYear(),
          bloodGroup: student.academicInfo?.bloodGroup || 'Not specified',
        },
        contact: {
          email: student.user.email,
          phone: student.contact,
          address: student.academicInfo?.address || 'Not specified',
          emergencyContact: student.academicInfo?.emergencyContact || 'Not specified',
        },
        academic: {
          department: student.department.name,
          year: `Year ${Math.ceil(student.semester / 2)}`,
          semester: `Semester ${student.semester}`,
          cgpa: cgpa,
          attendance: '85%', // This should come from real calculation
          advisor: student.academicInfo?.advisor || 'Not assigned',
        }
      };

      return res.status(200).json(profileData);
    } catch (error) {
      console.error('Error fetching student profile:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  // Handle PUT request for profile updates
  else if (req.method === 'PUT') {
    try {
      // Verify JWT token from Authorization header
      const token = req.headers.authorization?.split(' ')[1];
      const decoded = verifyToken(token);
      
      if (!decoded || decoded.role !== 'STUDENT') {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Find student by user ID
      const student = await prisma.student.findFirst({
        where: {
          userId: decoded.id
        }
      });

      if (!student) {
        return res.status(404).json({ message: 'Student not found' });
      }

      // Update student profile with request body
      const {
        personal,
        contact,
      } = req.body;

      // Update user name if provided
      if (personal?.name) {
        await prisma.user.update({
          where: { id: decoded.id },
          data: { name: personal.name }
        });
      }

      // Get current academicInfo to update specific fields
      const currentAcademicInfo = student.academicInfo || {};

      // Update student-specific fields
      await prisma.student.update({
        where: { id: student.id },
        data: {
          contact: contact?.phone || student.contact,
          academicInfo: {
            ...currentAcademicInfo,
            address: contact?.address || currentAcademicInfo.address,
            emergencyContact: contact?.emergencyContact || currentAcademicInfo.emergencyContact,
            bloodGroup: personal?.bloodGroup || currentAcademicInfo.bloodGroup,
          }
        }
      });

      return res.status(200).json({ message: 'Profile updated successfully' });
    } catch (error) {
      console.error('Error updating student profile:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  // Return 405 for other methods
  return res.status(405).json({ message: 'Method not allowed' });
}
