import { NextApiResponse } from 'next';
import { AuthenticatedRequest, withAuth, withRole } from '../../../lib/auth';

// Example of a route protected by authentication
async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  // User is already attached to request by middleware
  const user = req.user;

  return res.status(200).json({
    success: true,
    message: 'You have access to this protected resource',
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    }
  });
}

// Use auth middleware
export default withAuth(handler);

// For role-based access control, use withRole instead:
// export default withRole(handler, ['admin', 'teacher']);
