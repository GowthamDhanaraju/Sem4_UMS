import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import prisma from './prisma';

export interface AuthRequest extends NextApiRequest {
  user?: {
    id: string;
    role: string;
    email: string;
    name?: string;
  };
}

export type AuthenticatedRequest = AuthRequest & {
  user: {
    id: string;
    role: string;
    email: string;
    name?: string;
  };
};

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface DecodedToken {
  id: string;
  email: string;
  role: string;
  name?: string;
  iat: number;
  exp: number;
}

export function verifyToken(token?: string): DecodedToken | null {
  if (!token || typeof token !== 'string') return null;
  
  try {
    return jwt.verify(token, JWT_SECRET) as DecodedToken;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

export function generateToken(payload: { id: string; email: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export async function authenticate(
  req: AuthRequest,
  res: NextApiResponse,
  next: () => void
) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    
    // When finding the user, ensure to check all casing variants of role
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    };
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ message: 'Authentication failed' });
  }
}

// Helper for protected API routes
export function withAuth(handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>) {
  return async (req: AuthRequest, res: NextApiResponse) => {
    await new Promise<void>((resolve) => {
      authenticate(req, res, () => resolve());
    });
    
    // If we got here, authentication passed
    if (req.user) {
      return handler(req as AuthenticatedRequest, res);
    }
  };
}

// Helper for role-based protection
export function withRole(handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>, allowedRoles: string[]) {
  return async (req: AuthRequest, res: NextApiResponse) => {
    await new Promise<void>((resolve) => {
      authenticate(req, res, () => resolve());
    });
    
    // If we got here, authentication passed
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Check if user has the required role
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}` 
      });
    }
    
    return handler(req as AuthenticatedRequest, res);
  };
}
