import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../utils/db';
import { verifyToken } from '../../../utils/auth';
import { ObjectId } from 'mongodb';

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
      return res.status(400).json({ success: false, message: 'Invalid grade ID' });
    }

    let gradeId;
    try {
      gradeId = new ObjectId(id);
    } catch (error) {
      return res.status(400).json({ success: false, message: 'Invalid grade ID format' });
    }

    const { db } = await connectToDatabase();
    
    // Fetch the enrollment record that contains the grade
    const enrollment = await db.collection('enrollments').findOne({ _id: gradeId });
    
    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Grade record not found' });
    }
    
    // Authorization check
    const isAdmin = user.role === 'admin';
    const isTeacher = user.role === 'teacher';
    const isStudent = user.role === 'student';
    
    if (isStudent && enrollment.studentId.toString() !== user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    
    // For teachers, verify they teach this course
    let isAuthorized = isAdmin; // Admins always authorized
    
    if (isTeacher && !isAuthorized) {
      const course = await db.collection('courses').findOne({ 
        _id: enrollment.courseId,
        teacherId: new ObjectId(user.id)
      });
      
      isAuthorized = !!course;
    }
    
    if (!isAuthorized && !isStudent) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    
    // GET - Get grade details
    if (req.method === 'GET') {
      // Populate course and student data
      const course = await db.collection('courses').findOne(
        { _id: enrollment.courseId },
        { projection: { title: 1, code: 1, credits: 1 } }
      );
      
      const student = await db.collection('users').findOne(
        { _id: enrollment.studentId },
        { projection: { name: 1, email: 1 } }
      );
      
      return res.status(200).json({
        success: true,
        data: {
          _id: enrollment._id,
          courseId: enrollment.courseId,
          studentId: enrollment.studentId,
          grade: enrollment.grade,
          semester: enrollment.semester,
          course,
          student
        }
      });
    }

    // PUT - Update grade
    if (req.method === 'PUT') {
      // Only teachers of the course and admins can update grades
      if (!isAdmin && !isTeacher) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
      
      const { grade, comments } = req.body;
      
      if (!grade) {
        return res.status(400).json({
          success: false,
          message: 'Grade is required'
        });
      }
      
      // Validate grade format (could be A, B, C, D, F or numeric 0-100)
      const gradeRegex = /^([A-F]|[0-9]|[1-9][0-9]|100)$/;
      if (!gradeRegex.test(grade)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid grade format'
        });
      }
      
      const updateData: any = {
        grade,
        updatedAt: new Date(),
        updatedBy: new ObjectId(user.id)
      };
      
      if (comments) {
        updateData.comments = comments;
      }
      
      const result = await db.collection('enrollments').updateOne(
        { _id: gradeId },
        { $set: updateData }
      );
      
      if (result.matchedCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Grade record not found'
        });
      }
      
      const updatedEnrollment = await db.collection('enrollments').findOne({ _id: gradeId });
      
      return res.status(200).json({
        success: true,
        message: 'Grade updated successfully',
        data: updatedEnrollment
      });
    }

    // DELETE - Delete grade (actually just removes the grade field from enrollment)
    if (req.method === 'DELETE') {
      // Only admins can delete grades
      if (!isAdmin) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
      
      const result = await db.collection('enrollments').updateOne(
        { _id: gradeId },
        { 
          $unset: { grade: "", comments: "" },
          $set: { updatedAt: new Date(), updatedBy: new ObjectId(user.id) }
        }
      );
      
      if (result.matchedCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Grade record not found'
        });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Grade removed successfully'
      });
    }

    // Method not allowed
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  } catch (error) {
    console.error('Grade error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}
