import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/prisma';
import { verifyToken } from '../../../../lib/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // GET method - Fetch all auditorium events
  if (req.method === 'GET') {
    try {
      const events = await prisma.auditoriumBooking.findMany({
        include: {
          auditorium: true,
          teacher: true
        },
        orderBy: {
          date: 'desc'
        }
      });
      
      const formattedEvents = events.map(event => ({
        id: event.id,
        title: event.title,
        date: event.date,
        time: event.timeSlot,
        auditoriumId: event.auditoriumId,
        auditoriumName: event.auditorium.name,
        faculty: event.teacher ? event.teacher.name : '',
        description: event.description || '',
        status: event.status
      }));
      
      return res.status(200).json(formattedEvents);
    } catch (error) {
      console.error('Error fetching auditorium events:', error);
      return res.status(500).json({ message: 'Failed to fetch events' });
    }
  }
  
  // POST method - Create a new auditorium booking
  if (req.method === 'POST') {
    try {
      // For demonstration, we'll use a dummy teacher ID
      // In a real app, get this from authentication
      const { title, date, time, auditoriumId, faculty, club, description, status } = req.body;
      
      // Find a teacher to assign to this booking
      const teacher = await prisma.teacher.findFirst();
      if (!teacher) {
        return res.status(400).json({ message: 'No teachers available to assign to this booking' });
      }
      
      // Check if auditorium exists and is available
      const auditorium = await prisma.auditorium.findUnique({
        where: { id: auditoriumId }
      });
      
      if (!auditorium) {
        return res.status(404).json({ message: 'Auditorium not found' });
      }
      
      if (auditorium.status !== 'available') {
        return res.status(400).json({ 
          message: `Auditorium is currently ${auditorium.status}` 
        });
      }
      
      // Check for conflicting bookings
      const existingBooking = await prisma.auditoriumBooking.findFirst({
        where: {
          auditoriumId,
          date: new Date(date),
          timeSlot: time,
          status: { in: ['pending', 'approved'] }
        }
      });
      
      if (existingBooking) {
        return res.status(400).json({ 
          message: 'This time slot is already booked' 
        });
      }
      
      const newEvent = await prisma.auditoriumBooking.create({
        data: {
          title,
          date: new Date(date),
          timeSlot: time,
          auditoriumId,
          teacherId: teacher.id,
          description,
          status
        },
        include: {
          auditorium: true
        }
      });
      
      const formattedEvent = {
        id: newEvent.id,
        title: newEvent.title,
        date: newEvent.date,
        time: newEvent.timeSlot,
        auditoriumId: newEvent.auditoriumId,
        auditoriumName: newEvent.auditorium.name,
        faculty: faculty || '',
        club: club || '',
        description: newEvent.description || '',
        status: newEvent.status
      };
      
      return res.status(201).json(formattedEvent);
    } catch (error) {
      console.error('Error creating auditorium event:', error);
      return res.status(500).json({
        message: 'Failed to create event'
      });
    }
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
}
