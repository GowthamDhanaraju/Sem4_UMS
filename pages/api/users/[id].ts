import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Get the user ID from the URL
    const { id } = req.query
    const userId = String(id)

    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        // Get a specific user
        const user = await prisma.user.findUnique({
          where: { id: userId }
        })

        if (!user) {
          return res.status(404).json({ error: 'User not found' })
        }
        
        return res.status(200).json(user)

      case 'PUT':
        // Update a user
        const updatedUser = await prisma.user.update({
          where: { id: userId },
          data: req.body
        })
        
        return res.status(200).json(updatedUser)

      case 'DELETE':
        // Delete a user
        const deletedUser = await prisma.user.delete({
          where: { id: userId }
        })
        
        return res.status(200).json(deletedUser)
        
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
        return res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  } catch (error) {
    console.error('Request error:', error)
    
    // Handle specific Prisma errors
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Record not found' })
    }
    
    return res.status(500).json({ error: 'Internal Server Error', details: error.message })
  }
}
