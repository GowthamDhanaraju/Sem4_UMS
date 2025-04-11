import { PrismaClient } from '@prisma/client';
import chalk from 'chalk';

const prisma = new PrismaClient();

async function cleanupDatabase() {
  console.log(chalk.blue('Database Cleanup Utility'));
  console.log(chalk.yellow('Starting cleanup process...'));

  try {
    // 1. Remove old attendance records (older than 1 year)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    const deletedAttendance = await prisma.attendance.deleteMany({
      where: {
        date: {
          lt: oneYearAgo
        }
      }
    });
    console.log(chalk.green(`Deleted ${deletedAttendance.count} old attendance records`));

    // 2. Remove returned books
    const deletedBorrowedBooks = await prisma.borrowedBook.deleteMany({
      where: {
        returnDate: {
          not: null
        },
        // Only delete records older than 3 months
        borrowDate: {
          lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        }
      }
    });
    console.log(chalk.green(`Deleted ${deletedBorrowedBooks.count} old borrowed book records`));

    // 3. Remove old auditorium bookings
    const deletedBookings = await prisma.auditoriumBooking.deleteMany({
      where: {
        endTime: {
          lt: new Date()
        }
      }
    });
    console.log(chalk.green(`Deleted ${deletedBookings.count} past auditorium bookings`));

    // 4. Calculate database size
    const dbSize = await prisma.$queryRaw`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size;
    `;
    console.log(chalk.blue(`Current database size: ${JSON.stringify(dbSize)}`));

    console.log(chalk.green('Database cleanup completed successfully'));
  } catch (error) {
    console.error(chalk.red('Error during database cleanup:'), error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupDatabase();
