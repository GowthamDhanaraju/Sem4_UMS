import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        // Get all users
        const users = await prisma.user.findMany({
          // You can add options here, like 'select' to specify which fields to return
          // select: { id: true, name: true, email: true }
        })
        return res.status(200).json(users)

      case 'POST':
        // Create a new user
        const userData = req.body
        const newUser = await prisma.user.create({
          data: userData
        })
        return res.status(201).json(newUser)

      default:
        res.setHeader('Allow', ['GET', 'POST'])
        return res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  } catch (error) {
    console.error('Request error:', error)
    return res.status(500).json({ error: 'Internal Server Error', details: error.message })
  }
}
