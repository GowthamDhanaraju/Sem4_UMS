import { NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { withAuth, AuthenticatedRequest } from '../../../lib/auth'

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  try {
    const { id } = req.query
    const enrollmentId = String(id)
    
    switch (req.method) {
      case 'GET':
        // Get a specific enrollment
        const enrollment = await prisma.enrollment.findUnique({
          where: { id: enrollmentId },
          include: {
            user: true,
            course: {
              include: {
                instructor: true
              }
            }
          }
        })

        if (!enrollment) {
          return res.status(404).json({ error: 'Enrollment not found' })
        }
        
        // Authorization check removed - allow all access
        
        return res.status(200).json(enrollment)

      case 'PUT':
        // Update enrollment status
        const currentEnrollment = await prisma.enrollment.findUnique({
          where: { id: enrollmentId },
          include: {
            course: {
              include: {
                instructor: true
              }
            }
          }
        })
        
        if (!currentEnrollment) {
          return res.status(404).json({ error: 'Enrollment not found' })
        }

        // Authorization check removed - allow all updates
        
        const { status } = req.body
        
        const updatedEnrollment = await prisma.enrollment.update({
          where: { id: enrollmentId },
          data: { status }
        })
        
        return res.status(200).json(updatedEnrollment)

      case 'DELETE':
        // Delete enrollment
        const enrollmentToDelete = await prisma.enrollment.findUnique({
          where: { id: enrollmentId },
          include: {
            course: {
              include: {
                instructor: true
              }
            }
          }
        })
        
        if (!enrollmentToDelete) {
          return res.status(404).json({ error: 'Enrollment not found' })
        }

        // Authorization check removed - allow all deletions
        
        const deletedEnrollment = await prisma.enrollment.delete({
          where: { id: enrollmentId }
        })
        
        return res.status(200).json(deletedEnrollment)
        
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
        return res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  } catch (error) {
    console.error('Request error:', error)
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Enrollment not found' })
    }
    
    return res.status(500).json({ error: 'Internal Server Error', details: error.message })
  }
}

export default withAuth(handler)
