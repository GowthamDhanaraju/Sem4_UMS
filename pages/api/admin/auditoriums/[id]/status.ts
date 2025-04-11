import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../../lib/prisma';
import { verifyToken } from '../../../../../lib/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  const auditoriumId = Array.isArray(id) ? id[0] : id;
  
  // PATCH - Update auditorium status
  if (req.method === 'PATCH') {
    try {
      // Verify admin authorization - uncomment if you have auth implemented
      // const token = req.headers.authorization?.split(' ')[1];
      // const decoded = verifyToken(token);
      // 
      // if (!decoded || decoded.role !== 'ADMIN') {
      //   return res.status(401).json({ message: 'Unauthorized' });
      // }
      
      const { status, statusNote } = req.body;
      
      const updatedAuditorium = await prisma.auditorium.update({
        where: { id: auditoriumId },
        data: {
          status,
          statusNote
        }
      });
      
      // Update availability slots based on the new status
      if (status !== 'available') {
        // If auditorium is not available, mark all future slots as unavailable
        await prisma.availabilitySlot.updateMany({
          where: {
            auditoriumId: auditoriumId,
            date: {
              gte: new Date()
            }
          },
          data: {
            isAvailable: false
          }
        });
      } else {
        // If auditorium is now available, mark all future slots as available
        // (except those that are already booked)
        const bookedSlots = await prisma.auditoriumBooking.findMany({
          where: {
            auditoriumId: auditoriumId,
            date: {
              gte: new Date()
            },
            status: {
              in: ['pending', 'approved']
            }
          },
          select: {
            date: true,
            timeSlot: true
          }
        });
        
        // Get all future slots
        const futureSlots = await prisma.availabilitySlot.findMany({
          where: {
            auditoriumId: auditoriumId,
            date: {
              gte: new Date()
            }
          }
        });
        
        // Update each slot based on whether it's booked or not
        for (const slot of futureSlots) {
          const isBooked = bookedSlots.some(
            bookedSlot => 
              bookedSlot.date.toDateString() === slot.date.toDateString() && 
              bookedSlot.timeSlot === slot.timeSlot
          );
          
          if (!isBooked) {
            await prisma.availabilitySlot.update({
              where: { id: slot.id },
              data: { isAvailable: true }
            });
          }
        }
      }
      
      return res.status(200).json(updatedAuditorium);
    } catch (error) {
      console.error('Error updating auditorium status:', error);
      return res.status(500).json({ message: 'Failed to update status' });
    }
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
}
