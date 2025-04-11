import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../../lib/prisma';
import { verifyToken } from '../../../../../lib/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  const eventId = Array.isArray(id) ? id[0] : id;
  
  // DELETE - Delete an event
  if (req.method === 'DELETE') {
    try {
      // Verify admin authorization - uncomment if you have auth implemented
      // const token = req.headers.authorization?.split(' ')[1];
      // const decoded = verifyToken(token);
      // 
      // if (!decoded || decoded.role !== 'ADMIN') {
      //   return res.status(401).json({ message: 'Unauthorized' });
      // }
      
      const event = await prisma.auditoriumBooking.findUnique({
        where: { id: eventId }
      });
      
      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }
      
      // If the event was approved, make the slot available again
      if (event.status === 'approved') {
        await prisma.availabilitySlot.updateMany({
          where: {
            auditoriumId: event.auditoriumId,
            date: event.date,
            timeSlot: event.timeSlot
          },
          data: {
            isAvailable: true
          }
        });
      }
      
      // Delete the event
      await prisma.auditoriumBooking.delete({
        where: { id: eventId }
      });
      
      return res.status(200).json({ message: 'Event deleted successfully' });
    } catch (error) {
      console.error('Error deleting event:', error);
      return res.status(500).json({ message: 'Failed to delete event' });
    }
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
}
