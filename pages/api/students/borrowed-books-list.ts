import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const { studentId } = req.query;

    if (!studentId || typeof studentId !== "string") {
      return res.status(400).json({ success: false, message: "Student ID is required" });
    }

    // Find student by user ID
    let student = await prisma.student.findFirst({
      where: { userId: studentId }
    });

    // If not found, check if studentId is an actual student ID (not user ID)
    if (!student) {
      student = await prisma.student.findUnique({
        where: { id: studentId }
      });
    }

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    // Fetch borrowed books for this student
    const borrowedBooks = await prisma.borrowedBook.findMany({
      where: {
        studentId: student.id,
        status: "active" // Only show currently borrowed books
      },
      include: {
        book: true
      },
      orderBy: {
        borrowDate: 'desc'
      }
    });

    // Map to the expected format
    const formattedBooks = borrowedBooks.map(item => ({
      id: item.book.id,
      title: item.book.title,
      author: item.book.author,
      category: item.book.category,
      isbn: item.book.isbn,
      publisher: item.book.publisher,
      copies: item.book.copies,
      available: item.book.available,
      location: item.book.location,
      borrowDate: item.borrowDate.toISOString().split('T')[0],
      dueDate: item.dueDate.toISOString().split('T')[0],
      borrowId: item.id // Include the borrow record ID for return operations
    }));

    return res.status(200).json({ success: true, data: formattedBooks });
  } catch (error) {
    console.error("Error fetching borrowed books:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to fetch borrowed books" 
    });
  }
}
