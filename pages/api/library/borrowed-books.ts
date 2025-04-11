import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    // Get query parameters for filtering
    const { status, bookId, studentId } = req.query;
    
    // Create where clause for filtering
    let whereClause: any = {};
    
    if (status) {
      whereClause.status = status as string;
    } else {
      // By default, show only active borrows
      whereClause.status = 'active';
    }
    
    if (bookId) {
      whereClause.bookId = bookId as string;
    }
    
    if (studentId) {
      whereClause.studentId = studentId as string;
    }
    
    const borrowedBooks = await prisma.borrowedBook.findMany({
      where: whereClause,
      include: {
        book: true,
        student: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        borrowDate: 'desc',
      },
    });
    
    // Transform the data to include student name for ease of use
    const formattedBorrows = borrowedBooks.map(borrow => ({
      id: borrow.id,
      bookId: borrow.bookId,
      studentId: borrow.studentId,
      borrowDate: borrow.borrowDate,
      dueDate: borrow.dueDate,
      returnDate: borrow.returnDate,
      status: borrow.status,
      book: borrow.book,
      student: {
        name: borrow.student.user.name,
        studentId: borrow.student.studentId,
      }
    }));
    
    return res.status(200).json({ success: true, data: formattedBorrows });
  } catch (error) {
    console.error("Error fetching borrowed books:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to fetch borrowed books" 
    });
  }
}
