import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const { bookId, studentId, isUserIdNotStudentId } = req.body;

    if (!bookId || !studentId) {
      return res.status(400).json({ 
        success: false, 
        message: "Book ID and Student ID are required" 
      });
    }

    // Verify the book exists and has available copies
    const book = await prisma.book.findUnique({
      where: { id: bookId }
    });

    if (!book) {
      return res.status(404).json({ success: false, message: "Book not found" });
    }

    if (book.available <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: "This book is not available for borrowing" 
      });
    }

    // Get student record - handle the case where studentId might be a userId
    let student;
    
    if (isUserIdNotStudentId) {
      // If what we got is a userId, find the student by userId
      student = await prisma.student.findFirst({
        where: { userId: studentId }
      });
    } else {
      // Otherwise try to find the student directly by student ID
      student = await prisma.student.findUnique({
        where: { id: studentId }
      });
    }

    // If still not found and looks like a userId, try again
    if (!student && !isUserIdNotStudentId && studentId.startsWith('cl')) {
      student = await prisma.student.findFirst({
        where: { userId: studentId }
      });
    }

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    // Check if student already has this book borrowed
    const existingBorrow = await prisma.borrowedBook.findFirst({
      where: {
        bookId,
        studentId: student.id,
        status: 'active'
      }
    });

    if (existingBorrow) {
      return res.status(400).json({
        success: false,
        message: "This student has already borrowed this book"
      });
    }

    // Generate due date (14 days from now)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);

    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction([
      // Create borrowed book record
      prisma.borrowedBook.create({
        data: {
          bookId,
          studentId: student.id,
          borrowDate: new Date(),
          dueDate,
          status: 'active',
        },
      }),
      
      // Update book availability
      prisma.book.update({
        where: { id: bookId },
        data: { available: book.available - 1 },
      }),
    ]);

    return res.status(200).json({ 
      success: true, 
      data: result[0],
      message: "Book borrowed successfully" 
    });
  } catch (error) {
    console.error("Error borrowing book:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to borrow book" 
    });
  }
}
