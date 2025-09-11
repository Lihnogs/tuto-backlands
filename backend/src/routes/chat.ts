import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';

const ChatMessageSchema = z.object({
  content: z.string().min(1),
  is_user: z.boolean(),
});

const chatRoutes: FastifyPluginAsync = async (fastify) => {
  // Get chat messages for user
  fastify.get('/', {
    preHandler: [authenticate],
    schema: {
      description: 'Get chat messages for current user',
      tags: ['chat'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', minimum: 1, maximum: 100, default: 50 },
          offset: { type: 'number', minimum: 0, default: 0 },
        },
      },
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              user_id: { type: 'string' },
              content: { type: 'string' },
              is_user: { type: 'boolean' },
              created_at: { type: 'string' },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { limit = 50, offset = 0 } = request.query as { limit?: number; offset?: number };
      const userId = (request.user as any).id;

      const messages = await fastify.db`
        SELECT id, user_id, content, is_user, created_at
        FROM chat_messages
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      return reply.send((messages as any[]).reverse()); // Return in chronological order
    } catch (error) {
      fastify.log.error('Error fetching chat messages:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch chat messages',
      });
    }
  });

  // Create new chat message
  fastify.post('/', {
    preHandler: [authenticate],
    schema: {
      description: 'Create a new chat message',
      tags: ['chat'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['content', 'is_user'],
        properties: {
          content: { type: 'string', minLength: 1 },
          is_user: { type: 'boolean' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            user_id: { type: 'string' },
            content: { type: 'string' },
            is_user: { type: 'boolean' },
            created_at: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const messageData = ChatMessageSchema.parse(request.body);
      const userId = (request.user as any).id;

      const result = await fastify.db`
        INSERT INTO chat_messages (user_id, content, is_user)
        VALUES (${userId}, ${messageData.content}, ${messageData.is_user})
        RETURNING id, user_id, content, is_user, created_at
      `;

      return reply.status(201).send((result as any[])[0]);
    } catch (error) {
      fastify.log.error('Error creating chat message:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to create chat message',
      });
    }
  });

  // Delete chat message
  fastify.delete('/:id', {
    preHandler: [authenticate],
    schema: {
      description: 'Delete a chat message',
      tags: ['chat'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      response: {
        204: {
          type: 'null',
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = (request.user as any).id;

      const result = await fastify.db`
        DELETE FROM chat_messages 
        WHERE id = ${id} AND user_id = ${userId}
      `;

      if ((result as any[]).length === 0) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Message not found or not authorized',
        });
      }

      return reply.status(204).send();
    } catch (error) {
      fastify.log.error('Error deleting chat message:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to delete chat message',
      });
    }
  });

  // Clear all chat messages for user
  fastify.delete('/', {
    preHandler: [authenticate],
    schema: {
      description: 'Clear all chat messages for current user',
      tags: ['chat'],
      security: [{ bearerAuth: [] }],
      response: {
        204: {
          type: 'null',
        },
      },
    },
  }, async (request, reply) => {
    try {
      const userId = (request.user as any).id;

      await fastify.db`
        DELETE FROM chat_messages WHERE user_id = ${userId}
      `;

      return reply.status(204).send();
    } catch (error) {
      fastify.log.error('Error clearing chat messages:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to clear chat messages',
      });
    }
  });
};

export default chatRoutes;
