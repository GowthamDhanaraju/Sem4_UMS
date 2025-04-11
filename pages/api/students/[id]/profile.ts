import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/prisma';
import { verifyToken } from '../../../../lib/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  const studentId = String(id);

  // Handle GET request to fetch student profile
  if (req.method === 'GET') {
    try {
      // Verify authorization (optional, commented out for debugging)
      // Only uncomment after endpoint is working
      /*
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized: Missing or invalid token format'
        });
      }

      const token = authHeader.split(' ')[1];
      const decoded = verifyToken(token);

      if (!decoded) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized: Invalid token'
        });
      }
      */

      // Find the student by ID, userId, or studentId
      let student = null;
      
      // Try different ways to find the student
      student = await prisma.student.findFirst({
        where: {
          OR: [
            { id: studentId },
            { userId: studentId },
            { studentId: studentId }
          ]
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          department: true,
        },
      });

      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found',
        });
      }

      // Extract previous education data from academicInfo
      const academicInfo = student.academicInfo as any || {};
      const previousEducation = academicInfo.previousEducation || {
        school: '',
        grade: '',
        year: ''
      };

      // Get attendance percentage from attendance records (if available)
      let attendancePercentage = '';
      try {
        const attendanceRecords = await prisma.attendance.findMany({
          where: {
            studentId: student.id
          }
        });
        
        if (attendanceRecords.length > 0) {
          const totalRecords = attendanceRecords.length;
          const presentRecords = attendanceRecords.filter(
            record => record.status === 'present' || record.status === 'Present'
          ).length;
          
          attendancePercentage = `${Math.round((presentRecords / totalRecords) * 100)}%`;
        }
      } catch (error) {
        console.error('Error calculating attendance:', error);
        attendancePercentage = 'N/A';
      }

      // Format the response to match the expected profile structure
      const profileData = {
        success: true,
        data: {
          personal: {
            name: student.user?.name || student.name || "",
            photo: "",
            dob: student.dob?.toISOString().split('T')[0] || "",
            gender: student.gender === 'M' ? 'Male' : student.gender === 'F' ? 'Female' : 'Other',
            studentId: student.studentId,
            joinYear: student.joinDate?.getFullYear().toString() || "",
            bloodGroup: academicInfo.bloodGroup || "",
            nationality: academicInfo.nationality || "",
          },
          contact: {
            email: student.user?.email || "",
            phone: student.contact || ""
          },
          academic: {
            department: student.department?.name || "",
            year: `Year ${Math.ceil(student.semester / 2)}`,
            semester: `Semester ${student.semester}`,
            cgpa: academicInfo.currentGPA?.toString() || "",
            attendance: attendancePercentage || "N/A",
            previousEducation: previousEducation
          },
        },
      };

      return res.status(200).json(profileData);
    } catch (error) {
      console.error('Error fetching student profile:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch student profile',
      });
    }
  }

  // Handle PUT request to update student profile
  if (req.method === 'PUT') {
    try {
      const { personal, contact } = req.body;

      // Find student to update
      const student = await prisma.student.findFirst({
        where: {
          OR: [
            { id: studentId },
            { userId: studentId },
            { studentId: studentId }
          ]
        },
        include: {
          user: true
        }
      });

      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found',
        });
      }

      // Update user info if provided (name and email)
      if (personal?.name || contact?.email) {
        await prisma.user.update({
          where: { id: student.userId },
          data: {
            ...(personal?.name && { name: personal.name }),
            ...(contact?.email && { email: contact.email }),
          },
        });
      }

      // Get current academicInfo to preserve existing data
      const currentAcademicInfo = student.academicInfo as any || {};

      // Update student specific information
      await prisma.student.update({
        where: { 
          id: student.id 
        },
        data: {
          ...(personal?.gender && { 
            gender: personal.gender.charAt(0).toUpperCase() 
          }),
          ...(contact?.phone && { contact: contact.phone }),
          // Update the academicInfo JSON field with new values
          academicInfo: {
            ...currentAcademicInfo,
            ...(personal?.bloodGroup && { bloodGroup: personal.bloodGroup }),
            ...(personal?.nationality && { nationality: personal.nationality }),
            // Preserve the previousEducation data
            previousEducation: currentAcademicInfo.previousEducation || {}
          }
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
      });
    } catch (error) {
      console.error('Error updating student profile:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update profile',
      });
    }
  }

  // Handle other methods
  return res.status(405).json({
    success: false,
    message: 'Method not allowed',
  });
}
