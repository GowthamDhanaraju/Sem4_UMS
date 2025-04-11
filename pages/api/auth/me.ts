import { NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { withAuth, AuthenticatedRequest } from '../../../lib/auth'

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  try {
    const userId = req.user.id

    // Get the user with their profile based on role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        student: {
          include: {
            department: true
          }
        },
        teacher: {
          include: {
            department: true
          }
        },
        admin: true
      }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Return user profile
    return res.status(200).json({ user })
  } catch (error) {
    console.error('Profile fetch error:', error)
    return res.status(500).json({ error: 'Internal Server Error', details: error.message })
  }
}

export default withAuth(handler)
