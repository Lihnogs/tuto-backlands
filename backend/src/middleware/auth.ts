import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../services/authService.js';
import { User } from '../models/User.js';

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const authService = new AuthService(request.server);
    
    try {
      const decoded = authService.verifyToken(token);
      const user = await authService.getCurrentUser(decoded.userId);
      
      if (!user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not found'
        });
      }

      // Add user to request
      (request as any).user = user;
    } catch (error) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid token'
      });
    }
  } catch (error: any) {
    request.log.error('Authentication error:', error);
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Authentication failed'
    });
  }
}


