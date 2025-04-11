import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { withRole, AuthenticatedRequest } from '../../../lib/auth'

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET'])
      return res.status(405).end(`Method ${req.method} Not Allowed`)
    }

    // Get dashboard statistics
    const [
      totalStudents,
      totalTeachers,
      totalCourses,
      totalDepartments,
      recentEnrollments
    ] = await Promise.all([
      prisma.student.count(),
      prisma.teacher.count(),
      prisma.course.count(),
      prisma.department.count(),
      prisma.enrollment.findMany({
        take: 5,
        orderBy: { enrolledAt: 'desc' },
        include: {
          student: true,
          course: true
        }
      })
    ])

    return res.status(200).json({
      totalStudents,
      totalTeachers,
      totalCourses,
      totalDepartments,
      recentEnrollments
    })
  } catch (error) {
    console.error('Request error:', error)
    return res.status(500).json({ error: 'Internal Server Error', details: error.message })
  }
}

// Only admins can access this endpoint
export default withRole(handler, ['ADMIN'])
