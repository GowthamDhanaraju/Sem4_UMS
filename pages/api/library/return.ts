import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { borrowId, bookId } = req.body;

    if (!borrowId || !bookId) {
      return res.status(400).json({ success: false, message: 'Borrow ID and Book ID are required' });
    }

    // Find the borrowed book record
    const borrowedBook = await prisma.borrowedBook.findUnique({
      where: { id: borrowId },
      include: {
        book: true,
      },
    });

    if (!borrowedBook) {
      return res.status(404).json({ success: false, message: 'Borrow record not found' });
    }

    if (borrowedBook.status !== 'active') {
      return res.status(400).json({ success: false, message: 'This book has already been returned or is not in an active state' });
    }

    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction([
      // Update the borrowed book record
      prisma.borrowedBook.update({
        where: { id: borrowId },
        data: {
          status: 'returned',
          returnDate: new Date(),
        },
      }),
      // Update book availability
      prisma.book.update({
        where: { id: bookId },
        data: { available: borrowedBook.book.available + 1 },
      }),
    ]);

    return res.status(200).json({ success: true, data: result[0] });
  } catch (error) {
    console.error('Error returning book:', error);
    return res.status(500).json({ success: false, message: 'Failed to return book' });
  }
}
