import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { withAuth, AuthenticatedRequest } from '../../../lib/auth'

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  try {
    const { id } = req.query
    const teacherId = String(id)

    switch (req.method) {
      case 'GET':
        // Get a specific teacher with related data
        const teacher = await prisma.teacher.findUnique({
          where: { id: teacherId },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true,
                createdAt: true
              }
            },
            department: true,
            teachingCourses: {
              include: {
                course: true
              }
            },
            schedules: true
          }
        })

        if (!teacher) {
          return res.status(404).json({ error: 'Teacher not found' })
        }
        
        return res.status(200).json(teacher)

      case 'PUT':
        // Only admins or the teacher themselves can update
        const targetTeacher = await prisma.teacher.findUnique({
          where: { id: teacherId },
          select: { userId: true }
        })
        
        if (!targetTeacher) {
          return res.status(404).json({ error: 'Teacher not found' })
        }
        
        if (req.user.role !== 'ADMIN' && req.user.id !== targetTeacher.userId) {
          return res.status(403).json({ error: 'Not authorized to update this teacher' })
        }

        const { dob, joinDate, contact, ...updateData } = req.body
        
        const updatedTeacher = await prisma.teacher.update({
          where: { id: teacherId },
          data: {
            ...updateData,
            ...(dob && { dob: new Date(dob) }),
            ...(joinDate && { joinDate: new Date(joinDate) }),
            ...(contact && { contact })
          }
        })
        
        return res.status(200).json(updatedTeacher)

      case 'DELETE':
        // Only admins can delete teachers
        if (req.user.role !== 'ADMIN') {
          return res.status(403).json({ error: 'Only administrators can delete teachers' })
        }

        const deletedTeacher = await prisma.teacher.delete({
          where: { id: teacherId }
        })
        
        return res.status(200).json(deletedTeacher)
        
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
        return res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  } catch (error) {
    console.error('Request error:', error)
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Teacher not found' })
    }
    
    return res.status(500).json({ error: 'Internal Server Error', details: error.message })
  }
}

export default withAuth(handler)
