import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const auditoriums = await prisma.auditorium.findMany({
      include: {
        availabilitySlots: true, // Optional: Include related availability slots
      },
    });

    res.status(200).json({ auditoriums });
  } catch (error) {
    console.error("Error fetching auditoriums:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}