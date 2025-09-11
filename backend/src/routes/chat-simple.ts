import { FastifyPluginAsync } from 'fastify';
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const chatSimpleRoutes: FastifyPluginAsync = async (fastify) => {
  // Criar conexão direta com o banco
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/code_tutor';
  const sql = neon(connectionString);

  // Middleware de autenticação simplificado
  const authenticateUser = async (request: any, reply: any) => {
    try {
      const authHeader = request.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing or invalid authorization header'
        });
      }

      const token = authHeader.substring(7);
      const secret = process.env.JWT_SECRET || 'your-secret-key';
      
      try {
        const decoded = jwt.verify(token, secret) as any;
        const userId = decoded.userId;

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

        request.user = users[0];
      } catch (error) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid token'
        });
      }
    } catch (error) {
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Authentication failed'
      });
    }
  };

  // Listar mensagens do chat
  fastify.get('/', {
    preHandler: [authenticateUser],
    schema: {
      description: 'Get chat messages (simple version)',
      tags: ['chat'],
      response: {
        200: {
          type: 'object',
          properties: {
            messages: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  content: { type: 'string' },
                  is_user: { type: 'boolean' },
                  created_at: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const userId = (request as any).user.id;

      const messages = await sql`
        SELECT id, content, is_user, created_at
        FROM chat_messages 
        WHERE user_id = ${userId}
        ORDER BY created_at ASC
      `;

      return reply.send({
        messages,
      });
    } catch (error: any) {
      console.error('Error fetching chat messages:', error.message);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch chat messages',
      });
    }
  });

  // Criar mensagem no chat
  fastify.post('/', {
    preHandler: [authenticateUser],
    schema: {
      description: 'Create chat message (simple version)',
      tags: ['chat'],
      body: {
        type: 'object',
        required: ['content', 'is_user'],
        properties: {
          content: { type: 'string' },
          is_user: { type: 'boolean' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            message: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                content: { type: 'string' },
                is_user: { type: 'boolean' },
                created_at: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const userId = (request as any).user.id;
      const { content, is_user } = request.body as any;

      const result = await sql`
        INSERT INTO chat_messages (user_id, content, is_user)
        VALUES (${userId}, ${content}, ${is_user})
        RETURNING id, content, is_user, created_at
      `;

      const message = result[0];

      return reply.status(201).send({
        message,
      });
    } catch (error: any) {
      console.error('Error creating chat message:', error.message);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to create chat message',
      });
    }
  });

  // Deletar mensagem do chat
  fastify.delete('/:id', {
    preHandler: [authenticateUser],
    schema: {
      description: 'Delete chat message (simple version)',
      tags: ['chat'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const userId = (request as any).user.id;
      const { id } = request.params as any;

      const result = await sql`
        DELETE FROM chat_messages 
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING id
      `;

      if (result.length === 0) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Message not found or not authorized',
        });
      }

      return reply.send({
        message: 'Message deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting chat message:', error.message);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to delete chat message',
      });
    }
  });

  // Limpar todas as mensagens do chat
  fastify.delete('/', {
    preHandler: [authenticateUser],
    schema: {
      description: 'Clear all chat messages (simple version)',
      tags: ['chat'],
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const userId = (request as any).user.id;

      await sql`
        DELETE FROM chat_messages 
        WHERE user_id = ${userId}
      `;

      return reply.send({
        message: 'All chat messages cleared successfully',
      });
    } catch (error: any) {
      console.error('Error clearing chat messages:', error.message);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to clear chat messages',
      });
    }
  });
};

export default chatSimpleRoutes;
