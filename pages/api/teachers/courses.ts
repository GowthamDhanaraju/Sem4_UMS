import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const teacherId = req.user.id; // Assume authenticated user's ID is available in req.user
    const courses = await prisma.teacherCourse.findMany({
      where: { teacherId },
      include: {
        course: true,
      },
    });

    const response = courses.map((tc) => ({
      id: tc.course.id,
      name: tc.course.name,
    }));

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ error: "Failed to fetch courses." });
  }
}