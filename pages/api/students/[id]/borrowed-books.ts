import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const { id } = req.query;

    if (!id || typeof id !== "string") {
      return res.status(400).json({ success: false, message: "Invalid student ID" });
    }

    // Fetch borrowed books for this student
    const borrowedBooks = await prisma.borrowedBook.findMany({
      where: {
        student: {
          user: {
            id: id
          }
        },
        status: "active" // Only show currently borrowed books
      },
      include: {
        book: true
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
      dueDate: item.dueDate.toISOString().split('T')[0]
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
