import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // GET - Fetch all books
  if (req.method === 'GET') {
    try {
      const books = await prisma.book.findMany({
        orderBy: {
          title: 'asc'
        }
      });
      
      return res.status(200).json({ 
        success: true, 
        data: books 
      });
    } catch (error) {
      console.error("Error fetching books:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Failed to fetch books" 
      });
    }
  }
  
  // POST - Create a new book
  if (req.method === 'POST') {
    try {
      const { title, author, category, isbn, publisher, copies, available, location } = req.body;
      
      // Simple validation
      if (!title || !author || !category || !copies) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: title, author, category, and copies are required"
        });
      }
      
      // Set available to same as copies if not provided
      const availableCopies = available !== undefined ? available : copies;
      
      // Check if a book with the same ISBN already exists
      if (isbn) {
        const existingBook = await prisma.book.findUnique({
          where: { isbn }
        });
        
        if (existingBook) {
          return res.status(409).json({
            success: false,
            message: `A book with ISBN ${isbn} already exists`
          });
        }
      }
      
      const newBook = await prisma.book.create({
        data: {
          title,
          author,
          category,
          isbn: isbn || `temp-${Date.now()}`, // Generate a temporary ISBN if not provided
          publisher: publisher || "",
          copies: Number(copies),
          available: Number(availableCopies),
          location: location || "General Section"
        }
      });
      
      return res.status(201).json({
        success: true,
        data: newBook
      });
    } catch (error) {
      console.error("Error creating book:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to create book"
      });
    }
  }
  
  // Method not allowed
  return res.status(405).json({
    success: false,
    message: "Method not allowed"
  });
}
