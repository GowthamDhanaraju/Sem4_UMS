import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { connectToDatabase } from '../../../utils/db';
import { verifyToken } from '../../../utils/auth';
import { ObjectId } from 'mongodb';

// Validation schema for updating a program
const updateProgramSchema = z.object({
  name: z.string().min(3).optional(),
  code: z.string().min(2).optional(),
  degree: z.string().min(2).optional(),
  description: z.string().optional(),
  departmentId: z.string().optional(),
  duration: z.number().min(1).optional(),
  credits: z.number().min(1).optional(),
  status: z.enum(['active', 'inactive', 'draft']).optional()
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Verify authentication
    const user = await verifyToken(req);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid program ID' });
    }

    let programId;
    try {
      programId = new ObjectId(id);
    } catch (error) {
      return res.status(400).json({ success: false, message: 'Invalid program ID format' });
    }

    const { db } = await connectToDatabase();
    
    // GET - Get program details
    if (req.method === 'GET') {
      const program = await db.collection('programs').findOne({ _id: programId });
      
      if (!program) {
        return res.status(404).json({ success: false, message: 'Program not found' });
      }
      
      // Get department details
      let department = null;
      if (program.departmentId) {
        department = await db.collection('departments').findOne(
          { _id: new ObjectId(program.departmentId) },
          { projection: { name: 1, code: 1 } }
        );
      }
      
      return res.status(200).json({ 
        success: true, 
        data: {
          ...program,
          department
        } 
      });
    }

    // Only admins can modify programs
    if (user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    // PUT - Update program
    if (req.method === 'PUT') {
      try {
        const validatedData = updateProgramSchema.parse(req.body);
        
        // Check if code already exists (if updating code)
        if (validatedData.code) {
          const existingProgram = await db.collection('programs').findOne({
            code: validatedData.code,
            _id: { $ne: programId }
          });
          
          if (existingProgram) {
            return res.status(400).json({
              success: false,
              message: 'Program code already exists'
            });
          }
        }
        
        // Process departmentId if provided
        if (validatedData.departmentId) {
          try {
            validatedData.departmentId = new ObjectId(validatedData.departmentId);
            
            // Check if department exists
            const department = await db.collection('departments').findOne({
              _id: validatedData.departmentId
            });
            
            if (!department) {
              return res.status(404).json({
                success: false,
                message: 'Department not found'
              });
            }
          } catch (error) {
            return res.status(400).json({
              success: false,
              message: 'Invalid department ID format'
            });
          }
        }
        
        const updateData = {
          ...validatedData,
          updatedAt: new Date()
        };
        
        const result = await db.collection('programs').updateOne(
          { _id: programId },
          { $set: updateData }
        );
        
        if (result.matchedCount === 0) {
          return res.status(404).json({
            success: false,
            message: 'Program not found'
          });
        }
        
        const updatedProgram = await db.collection('programs').findOne({ _id: programId });
        
        return res.status(200).json({
          success: true,
          message: 'Program updated successfully',
          data: updatedProgram
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

    // DELETE - Delete program
    if (req.method === 'DELETE') {
      // Check if program has associated courses
      const associatedCourses = await db.collection('courses').findOne({
        programId: programId
      });
      
      if (associatedCourses) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete program with associated courses'
        });
      }
      
      const result = await db.collection('programs').deleteOne({ _id: programId });
      
      if (result.deletedCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Program not found'
        });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Program deleted successfully'
      });
    }

    // Method not allowed
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  } catch (error) {
    console.error('Program error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}
