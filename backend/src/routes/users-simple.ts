import { FastifyPluginAsync } from 'fastify';
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const usersSimpleRoutes: FastifyPluginAsync = async (fastify) => {
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

  // Listar todos os usuários (apenas para administradores)
  fastify.get('/', {
    preHandler: [authenticateUser],
    schema: {
      description: 'Get all users (simple version)',
      tags: ['users'],
      response: {
        200: {
          type: 'object',
          properties: {
            users: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  name: { type: 'string' },
                  level: { type: 'number' },
                  xp: { type: 'number' },
                  completed_exercises: { type: 'number' },
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
      // Por enquanto, permitir que qualquer usuário autenticado veja a lista
      // Em produção, você pode adicionar verificação de role/permissão
      const users = await sql`
        SELECT id, email, name, level, xp, completed_exercises, created_at
        FROM users
        ORDER BY created_at DESC
      `;

      return reply.send({
        users,
      });
    } catch (error: any) {
      console.error('Error fetching users:', error.message);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch users',
      });
    }
  });

  // Buscar usuário específico
  fastify.get('/:id', {
    preHandler: [authenticateUser],
    schema: {
      description: 'Get specific user (simple version)',
      tags: ['users'],
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
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                name: { type: 'string' },
                level: { type: 'number' },
                xp: { type: 'number' },
                completed_exercises: { type: 'number' },
                created_at: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      const currentUser = (request as any).user;

      // Permitir que usuários vejam seus próprios dados ou dados de outros usuários
      const users = await sql`
        SELECT id, email, name, level, xp, completed_exercises, created_at
        FROM users 
        WHERE id = ${id}
      `;

      if (users.length === 0) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'User not found',
        });
      }

      return reply.send({
        user: users[0],
      });
    } catch (error: any) {
      console.error('Error fetching user:', error.message);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch user',
      });
    }
  });

  // Atualizar perfil do usuário
  fastify.put('/:id', {
    preHandler: [authenticateUser],
    schema: {
      description: 'Update user profile (simple version)',
      tags: ['users'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          avatar_url: { type: 'string' },
          level: { type: 'number' },
          xp: { type: 'number' },
          completed_exercises: { type: 'number' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                name: { type: 'string' },
                level: { type: 'number' },
                xp: { type: 'number' },
                completed_exercises: { type: 'number' },
                updated_at: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      const currentUser = (request as any).user;
      const updateData = request.body as any;

      // Verificar se o usuário está tentando atualizar seu próprio perfil
      if (currentUser.id !== id) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'You can only update your own profile',
        });
      }

      // Construir query de atualização dinamicamente
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      if (updateData.name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        updateValues.push(updateData.name);
      }

      if (updateData.avatar_url !== undefined) {
        updateFields.push(`avatar_url = $${paramIndex++}`);
        updateValues.push(updateData.avatar_url);
      }

      if (updateData.level !== undefined) {
        updateFields.push(`level = $${paramIndex++}`);
        updateValues.push(updateData.level);
      }

      if (updateData.xp !== undefined) {
        updateFields.push(`xp = $${paramIndex++}`);
        updateValues.push(updateData.xp);
      }

      if (updateData.completed_exercises !== undefined) {
        updateFields.push(`completed_exercises = $${paramIndex++}`);
        updateValues.push(updateData.completed_exercises);
      }

      if (updateFields.length === 0) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'No fields to update',
        });
      }

      // Adicionar ID do usuário aos valores
      updateValues.push(id);

      const result = await sql`
        UPDATE users 
        SET ${sql.unsafe(updateFields.join(', '))}, updated_at = NOW()
        WHERE id = $${paramIndex}
        RETURNING id, email, name, level, xp, completed_exercises, updated_at
      `;

      if (result.length === 0) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'User not found',
        });
      }

      return reply.send({
        user: result[0],
      });
    } catch (error: any) {
      console.error('Error updating user:', error.message);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to update user',
      });
    }
  });

  // Deletar usuário
  fastify.delete('/:id', {
    preHandler: [authenticateUser],
    schema: {
      description: 'Delete user (simple version)',
      tags: ['users'],
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
      const { id } = request.params as any;
      const currentUser = (request as any).user;

      // Verificar se o usuário está tentando deletar sua própria conta
      if (currentUser.id !== id) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'You can only delete your own account',
        });
      }

      const result = await sql`
        DELETE FROM users 
        WHERE id = ${id}
        RETURNING id
      `;

      if (result.length === 0) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'User not found',
        });
      }

      return reply.send({
        message: 'User deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting user:', error.message);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to delete user',
      });
    }
  });

  // Estatísticas do usuário
  fastify.get('/:id/stats', {
    preHandler: [authenticateUser],
    schema: {
      description: 'Get user stats (simple version)',
      tags: ['users'],
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
            stats: {
              type: 'object',
              properties: {
                total_chat_messages: { type: 'number' },
                total_code_analyses: { type: 'number' },
                average_code_score: { type: 'number' },
                languages_used: { type: 'array', items: { type: 'string' } },
                join_date: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params as any;

      // Verificar se o usuário existe
      const userExists = await sql`
        SELECT id FROM users WHERE id = ${id}
      `;

      if (userExists.length === 0) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'User not found',
        });
      }

      // Total de mensagens do chat
      const chatCountResult = await sql`
        SELECT COUNT(*) as total
        FROM chat_messages 
        WHERE user_id = ${id}
      `;
      const totalChatMessages = chatCountResult[0].total;

      // Total de análises de código
      const analysisCountResult = await sql`
        SELECT COUNT(*) as total
        FROM code_analyses 
        WHERE user_id = ${id}
      `;
      const totalCodeAnalyses = analysisCountResult[0].total;

      // Score médio das análises
      const avgScoreResult = await sql`
        SELECT AVG(score) as average
        FROM code_analyses 
        WHERE user_id = ${id}
      `;
      const averageCodeScore = avgScoreResult[0].average || 0;

      // Linguagens utilizadas
      const languagesResult = await sql`
        SELECT DISTINCT language
        FROM code_analyses 
        WHERE user_id = ${id}
        ORDER BY language
      `;
      const languagesUsed = languagesResult.map((row: any) => row.language);

      // Data de criação da conta
      const userResult = await sql`
        SELECT created_at
        FROM users 
        WHERE id = ${id}
      `;
      const joinDate = userResult[0].created_at;

      return reply.send({
        stats: {
          total_chat_messages: totalChatMessages,
          total_code_analyses: totalCodeAnalyses,
          average_code_score: Math.round(averageCodeScore * 100) / 100,
          languages_used: languagesUsed,
          join_date: joinDate,
        },
      });
    } catch (error: any) {
      console.error('Error fetching user stats:', error.message);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch user stats',
      });
    }
  });
};

export default usersSimpleRoutes;
