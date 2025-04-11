import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import prisma from '../../../lib/prisma';
import { verifyToken } from '../../../lib/auth';
// Validation schema for creating an auditorium
const createAuditoriumSchema = z.object({
  name: z.string().min(2),
  location: z.string(),
  capacity: z.number().min(1),
  hasWhiteboard: z.boolean().default(false),
  amenities: z.array(z.string()).default([]),
  status: z.enum(['available', 'maintenance', 'repair', 'reserved']).default('available'),
  statusNote: z.string().optional()
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    // GET - List auditoriums
    if (req.method === 'GET') {
      const { status, capacity, date, search, page = '1', limit = '20' } = req.query;
      const query: any = {};
      
      // Build Prisma query instead of MongoDB query
      let whereClause: any = {};
      
      if (status) {
        whereClause.status = status as string;
      }
      
      if (capacity) {
        whereClause.capacity = {
          gte: parseInt(capacity as string, 10)
        };
      }
      
      if (search) {
        const searchString = String(search);
        whereClause.OR = [
          { name: { contains: searchString, mode: 'insensitive' } },
          { location: { contains: searchString, mode: 'insensitive' } }
        ];
      }
      
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;
      
      const auditoriums = await prisma.auditorium.findMany({
        where: whereClause,
        orderBy: { name: 'asc' },
        skip,
        take: limitNum,
      });
      
      // If a date is provided, check bookings for that date
      if (date) {
        const bookings = await prisma.auditoriumBooking.findMany({
          where: { date: date as string },
        });
        
        // Map bookings to auditoriums
        const auditoriumBookings = bookings.reduce((acc, booking) => {
          if (!acc[booking.auditoriumId]) {
            acc[booking.auditoriumId] = [];
          }
          acc[booking.auditoriumId].push(booking);
          return acc;
        }, {} as Record<string, any[]>);
        
        // Add booking info to auditoriums
        for (const auditorium of auditoriums) {
          const id = auditorium.id;
          auditorium.bookings = auditoriumBookings[id] || [];
        }
      }
      
      const total = await prisma.auditorium.count({ where: whereClause });
      
      return res.status(200).json({
        success: true,
        data: auditoriums,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum)
        }
      });
    }

    // Only admins can create auditoriums
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    // POST - Create new auditorium
    if (req.method === 'POST') {
      try {
        const validatedData = createAuditoriumSchema.parse(req.body);
        
        // Check if an auditorium with the same name exists
        const existingAuditorium = await prisma.auditorium.findFirst({
          where: { name: validatedData.name }
        });
        
        if (existingAuditorium) {
          return res.status(400).json({
            success: false,
            message: 'Auditorium with this name already exists'
          });
        }
        
        const newAuditorium = await prisma.auditorium.create({
          data: {
            ...validatedData,
            createdBy: user.id
          }
        });
        
        return res.status(201).json({
          success: true,
          message: 'Auditorium created successfully',
          data: newAuditorium
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: error.errors
          });
        }
        throw error;
      }
    }

    // Method not allowed
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  } catch (error) {
    console.error('Auditorium error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}
