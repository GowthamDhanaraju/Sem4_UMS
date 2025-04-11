import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../../lib/prisma';
import { verifyToken } from '../../../../../lib/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  const auditoriumId = Array.isArray(id) ? id[0] : id;
  
  // DELETE - Delete an auditorium
  if (req.method === 'DELETE') {
    try {
      // Verify admin authorization - uncomment if you have auth implemented
      // const token = req.headers.authorization?.split(' ')[1];
      // const decoded = verifyToken(token);
      // 
      // if (!decoded || decoded.role !== 'ADMIN') {
      //   return res.status(401).json({ message: 'Unauthorized' });
      // }
      
      // Delete related availability slots first to avoid foreign key constraints
      await prisma.availabilitySlot.deleteMany({
        where: { auditoriumId: auditoriumId }
      });
      
      // Delete related bookings
      await prisma.auditoriumBooking.deleteMany({
        where: { auditoriumId: auditoriumId }
      });
      
      // Delete the auditorium
      await prisma.auditorium.delete({
        where: { id: auditoriumId }
      });
      
      return res.status(200).json({ message: 'Auditorium deleted successfully' });
    } catch (error) {
      console.error('Error deleting auditorium:', error);
      return res.status(500).json({ message: 'Failed to delete auditorium' });
    }
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
}
