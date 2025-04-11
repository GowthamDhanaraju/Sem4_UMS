import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // This would normally fetch from a database table tracking system activities
    // For now, we'll return sample data since this is just for demonstration
    
    // Sample activities - in a real app, you'd fetch these from a database
    const activities = [
      { 
        id: '1', 
        type: 'enrollment', 
        description: 'New student enrolled in Computer Science', 
        date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), 
        user: 'John Doe' 
      },
      { 
        id: '2', 
        type: 'course', 
        description: 'New course added: Advanced Machine Learning', 
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() 
      },
      { 
        id: '3', 
        type: 'faculty', 
        description: 'New faculty member joined: Dr. Emily Chen', 
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() 
      },
      { 
        id: '4', 
        type: 'announcement', 
        description: 'Academic calendar for next semester published', 
        date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() 
      },
      { 
        id: '5', 
        type: 'event', 
        description: 'Annual tech symposium scheduled for next month', 
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() 
      }
    ];

    return res.status(200).json(activities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    // Always return JSON even when there's an error
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch activities' 
    });
  }
}
