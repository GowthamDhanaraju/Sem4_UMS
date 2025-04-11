import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case 'GET':
        // Get all enrollments with related user and course data
        const enrollments = await prisma.enrollment.findMany({
          include: {
            user: true,
            course: true
          }
        })
        return res.status(200).json(enrollments)

      case 'POST':
        // Create a new enrollment
        const { userId, courseId, status } = req.body

        // Check if user and course exist
        const user = await prisma.user.findUnique({ where: { id: userId } })
        if (!user) {
          return res.status(404).json({ error: 'User not found' })
        }

        const course = await prisma.course.findUnique({ where: { id: courseId } })
        if (!course) {
          return res.status(404).json({ error: 'Course not found' })
        }

        // Check if enrollment already exists
        const existingEnrollment = await prisma.enrollment.findFirst({
          where: {
            userId,
            courseId
          }
        })

        if (existingEnrollment) {
          return res.status(409).json({ error: 'User already enrolled in this course' })
        }

        // Create enrollment
        const newEnrollment = await prisma.enrollment.create({
          data: {
            userId,
            courseId,
            status: status || 'PENDING',
            enrolledAt: new Date()
          },
          include: {
            user: true,
            course: true
          }
        })

        return res.status(201).json(newEnrollment)

      default:
        res.setHeader('Allow', ['GET', 'POST'])
        return res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  } catch (error) {
    console.error('Request error:', error)
    return res.status(500).json({ error: 'Internal Server Error', details: error.message })
  }
}
