import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // GET: Fetch user profile based on user role
  if (req.method === 'GET') {
    try {
      const { userId, role } = req.query;
      
      if (!userId) {
        return res.status(400).json({ 
          success: false, 
          message: 'User ID is required' 
        });
      }
      
      let profile;
      
      switch (role) {
        case 'student': 
          profile = await prisma.student.findFirst({
            where: { userId: String(userId) },
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                  role: true,
                }
              },
              department: true,
              enrollments: {
                include: {
                  course: {
                    include: {
                      teacher: {
                        include: {
                          user: {
                            select: { name: true }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          });
          break;
          
        case 'teacher':
          profile = await prisma.teacher.findFirst({
            where: { userId: String(userId) },
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                  role: true,
                }
              },
              department: true,
              courses: {
                include: {
                  enrollments: true
                }
              }
            }
          });
          break;
          
        case 'admin':
          profile = await prisma.user.findUnique({
            where: { id: String(userId) },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            }
          });
          break;
          
        default:
          return res.status(400).json({ 
            success: false, 
            message: 'Invalid role specified' 
          });
      }
      
      if (!profile) {
        return res.status(404).json({ 
          success: false, 
          message: 'Profile not found' 
        });
      }
      
      return res.status(200).json({ success: true, data: profile });
    } catch (error) {
      console.error('Profile fetch error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch profile' 
      });
    }
  }
  
  // PUT: Update user profile
  if (req.method === 'PUT') {
    try {
      const { userId, role, ...data } = req.body;
      
      if (!userId || !role) {
        return res.status(400).json({ 
          success: false, 
          message: 'User ID and role are required' 
        });
      }
      
      let updatedProfile;
      
      // Extract user-specific and role-specific data
      const { name, email, ...roleSpecificData } = data;
      
      // Update user data if provided
      if (name || email) {
        await prisma.user.update({
          where: { id: userId },
          data: { 
            ...(name && { name }),
            ...(email && { email }) 
          }
        });
      }
      
      // Update role-specific data
      switch (role) {
        case 'student':
          if (Object.keys(roleSpecificData).length > 0) {
            const student = await prisma.student.findFirst({
              where: { userId }
            });
            
            if (!student) {
              return res.status(404).json({ 
                success: false, 
                message: 'Student profile not found' 
              });
            }
            
            updatedProfile = await prisma.student.update({
              where: { id: student.id },
              data: roleSpecificData,
              include: {
                user: {
                  select: {
                    name: true,
                    email: true
                  }
                }
              }
            });
          }
          break;
          
        case 'teacher':
          if (Object.keys(roleSpecificData).length > 0) {
            const teacher = await prisma.teacher.findFirst({
              where: { userId }
            });
            
            if (!teacher) {
              return res.status(404).json({ 
                success: false, 
                message: 'Teacher profile not found' 
              });
            }
            
            updatedProfile = await prisma.teacher.update({
              where: { id: teacher.id },
              data: roleSpecificData,
              include: {
                user: {
                  select: {
                    name: true,
                    email: true
                  }
                }
              }
            });
          }
          break;
          
        default:
          return res.status(400).json({ 
            success: false, 
            message: 'Profile updates for this role are not supported' 
          });
      }
      
      return res.status(200).json({ 
        success: true, 
        message: 'Profile updated successfully',
        data: updatedProfile
      });
    } catch (error) {
      console.error('Profile update error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to update profile' 
      });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
