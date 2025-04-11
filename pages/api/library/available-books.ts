import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    // Get query parameters for filtering
    const { category, search } = req.query;
    
    // Create where clause for filtering
    let whereClause: any = {};
    
    if (category && category !== "All") {
      whereClause.category = category as string;
    }
    
    if (search) {
      whereClause.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { author: { contains: search as string, mode: 'insensitive' } },
        { category: { contains: search as string, mode: 'insensitive' } }
      ];
    }
    
    const books = await prisma.book.findMany({
      where: whereClause,
      orderBy: { title: 'asc' }
    });

    return res.status(200).json({ success: true, data: books });
  } catch (error) {
    console.error("Error fetching books:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to fetch books" 
    });
  }
}
