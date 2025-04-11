import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ 
      success: false, 
      message: "Invalid book ID" 
    });
  }

  // GET - Fetch a single book
  if (req.method === 'GET') {
    try {
      const book = await prisma.book.findUnique({
        where: { id },
        include: {
          borrowedBooks: {
            where: { status: 'active' },
            include: {
              student: {
                select: {
                  name: true,
                  studentId: true
                }
              }
            }
          }
        }
      });
      
      if (!book) {
        return res.status(404).json({ 
          success: false, 
          message: "Book not found" 
        });
      }
      
      return res.status(200).json({ 
        success: true, 
        data: book 
      });
    } catch (error) {
      console.error("Error fetching book:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Failed to fetch book" 
      });
    }
  }
  
  // PUT - Update a book
  if (req.method === 'PUT') {
    try {
      const { title, author, category, isbn, publisher, copies, available, location } = req.body;
      
      // Check if book exists
      const existingBook = await prisma.book.findUnique({
        where: { id }
      });
      
      if (!existingBook) {
        return res.status(404).json({ 
          success: false, 
          message: "Book not found" 
        });
      }
      
      // If ISBN is being changed, check if it conflicts with another book
      if (isbn && isbn !== existingBook.isbn) {
        const bookWithSameISBN = await prisma.book.findUnique({
          where: { isbn }
        });
        
        if (bookWithSameISBN && bookWithSameISBN.id !== id) {
          return res.status(409).json({
            success: false,
            message: `Another book already uses ISBN ${isbn}`
          });
        }
      }
      
      // Make sure available copies don't exceed total copies
      let updatedAvailable = available;
      if (copies !== undefined && available > copies) {
        updatedAvailable = copies;
      }
      
      const updatedBook = await prisma.book.update({
        where: { id },
        data: {
          title: title !== undefined ? title : undefined,
          author: author !== undefined ? author : undefined,
          category: category !== undefined ? category : undefined,
          isbn: isbn !== undefined ? isbn : undefined,
          publisher: publisher !== undefined ? publisher : undefined,
          copies: copies !== undefined ? Number(copies) : undefined,
          available: updatedAvailable !== undefined ? Number(updatedAvailable) : undefined,
          location: location !== undefined ? location : undefined
        }
      });
      
      return res.status(200).json({ 
        success: true, 
        data: updatedBook 
      });
    } catch (error) {
      console.error("Error updating book:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Failed to update book" 
      });
    }
  }
  
  // DELETE - Delete a book
  if (req.method === 'DELETE') {
    try {
      // Check if book has active borrows
      const activeBorrows = await prisma.borrowedBook.findFirst({
        where: {
          bookId: id,
          status: 'active'
        }
      });
      
      if (activeBorrows) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete book with active borrows. Please ensure all copies are returned first."
        });
      }
      
      // Delete related borrowed book records (historical records)
      await prisma.borrowedBook.deleteMany({
        where: { bookId: id }
      });
      
      // Delete the book
      await prisma.book.delete({
        where: { id }
      });
      
      return res.status(200).json({ 
        success: true, 
        message: "Book deleted successfully" 
      });
    } catch (error) {
      console.error("Error deleting book:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Failed to delete book" 
      });
    }
  }
  
  // Method not allowed
  return res.status(405).json({
    success: false,
    message: "Method not allowed"
  });
}
