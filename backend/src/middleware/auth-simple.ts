import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

export async function authenticateSimple(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    
    try {
      // Verificar token
      const decoded = jwt.verify(token, secret) as any;
      const userId = decoded.userId;

      // Buscar usuário diretamente no banco
      const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/code_tutor';
      const sql = neon(connectionString);
      
      const users = await sql`
        SELECT id, email, name, created_at
        FROM users WHERE id = ${userId}
      `;

      if (users.length === 0) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not found'
        });
      }

      // Add user to request
      (request as any).user = users[0];
    } catch (error) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid token'
      });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Authentication failed'
    });
  }
}
