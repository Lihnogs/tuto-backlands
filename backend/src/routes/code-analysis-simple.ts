import { FastifyPluginAsync } from 'fastify';
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const codeAnalysisSimpleRoutes: FastifyPluginAsync = async (fastify) => {
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

  // Listar análises de código
  fastify.get('/', {
    preHandler: [authenticateUser],
    schema: {
      description: 'Get code analyses (simple version)',
      tags: ['code-analysis'],
      response: {
        200: {
          type: 'object',
          properties: {
            analyses: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  code: { type: 'string' },
                  language: { type: 'string' },
                  score: { type: 'number' },
                  feedback: { type: 'array', items: { type: 'string' } },
                  suggestions: { type: 'array', items: { type: 'string' } },
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

      const analyses = await sql`
        SELECT id, code, language, score, feedback, suggestions, created_at
        FROM code_analyses 
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
      `;

      return reply.send({
        analyses,
      });
    } catch (error: any) {
      console.error('Error fetching code analyses:', error.message);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch code analyses',
      });
    }
  });

  // Buscar análise específica
  fastify.get('/:id', {
    preHandler: [authenticateUser],
    schema: {
      description: 'Get specific code analysis (simple version)',
      tags: ['code-analysis'],
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
            analysis: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                code: { type: 'string' },
                language: { type: 'string' },
                score: { type: 'number' },
                feedback: { type: 'array', items: { type: 'string' } },
                suggestions: { type: 'array', items: { type: 'string' } },
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
      const { id } = request.params as any;

      const analyses = await sql`
        SELECT id, code, language, score, feedback, suggestions, created_at
        FROM code_analyses 
        WHERE id = ${id} AND user_id = ${userId}
      `;

      if (analyses.length === 0) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Analysis not found or not authorized',
        });
      }

      return reply.send({
        analysis: analyses[0],
      });
    } catch (error: any) {
      console.error('Error fetching code analysis:', error.message);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch code analysis',
      });
    }
  });

  // Criar análise de código
  fastify.post('/', {
    preHandler: [authenticateUser],
    schema: {
      description: 'Create code analysis (simple version)',
      tags: ['code-analysis'],
      body: {
        type: 'object',
        required: ['code', 'language', 'score', 'feedback', 'suggestions'],
        properties: {
          code: { type: 'string' },
          language: { type: 'string' },
          score: { type: 'number' },
          feedback: { type: 'array', items: { type: 'string' } },
          suggestions: { type: 'array', items: { type: 'string' } },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            analysis: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                code: { type: 'string' },
                language: { type: 'string' },
                score: { type: 'number' },
                feedback: { type: 'array', items: { type: 'string' } },
                suggestions: { type: 'array', items: { type: 'string' } },
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
      const { code, language, score, feedback, suggestions } = request.body as any;

      const result = await sql`
        INSERT INTO code_analyses (user_id, code, language, score, feedback, suggestions)
        VALUES (${userId}, ${code}, ${language}, ${score}, ${feedback}, ${suggestions})
        RETURNING id, code, language, score, feedback, suggestions, created_at
      `;

      const analysis = result[0];

      return reply.status(201).send({
        analysis,
      });
    } catch (error: any) {
      console.error('Error creating code analysis:', error.message);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to create code analysis',
      });
    }
  });

  // Deletar análise de código
  fastify.delete('/:id', {
    preHandler: [authenticateUser],
    schema: {
      description: 'Delete code analysis (simple version)',
      tags: ['code-analysis'],
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
        DELETE FROM code_analyses 
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING id
      `;

      if (result.length === 0) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Analysis not found or not authorized',
        });
      }

      return reply.send({
        message: 'Analysis deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting code analysis:', error.message);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to delete code analysis',
      });
    }
  });

  // Estatísticas de análise de código
  fastify.get('/stats/summary', {
    preHandler: [authenticateUser],
    schema: {
      description: 'Get code analysis stats (simple version)',
      tags: ['code-analysis'],
      response: {
        200: {
          type: 'object',
          properties: {
            total_analyses: { type: 'number' },
            average_score: { type: 'number' },
            languages_used: { type: 'array', items: { type: 'string' } },
            recent_analyses: { type: 'array' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const userId = (request as any).user.id;

      // Total de análises
      const totalResult = await sql`
        SELECT COUNT(*) as total
        FROM code_analyses 
        WHERE user_id = ${userId}
      `;
      const totalAnalyses = totalResult[0].total;

      // Score médio
      const avgResult = await sql`
        SELECT AVG(score) as average
        FROM code_analyses 
        WHERE user_id = ${userId}
      `;
      const averageScore = avgResult[0].average || 0;

      // Linguagens utilizadas
      const languagesResult = await sql`
        SELECT DISTINCT language
        FROM code_analyses 
        WHERE user_id = ${userId}
        ORDER BY language
      `;
      const languagesUsed = languagesResult.map((row: any) => row.language);

      // Análises recentes
      const recentResult = await sql`
        SELECT id, language, score, created_at
        FROM code_analyses 
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 5
      `;

      return reply.send({
        total_analyses: totalAnalyses,
        average_score: Math.round(averageScore * 100) / 100,
        languages_used: languagesUsed,
        recent_analyses: recentResult,
      });
    } catch (error: any) {
      console.error('Error fetching code analysis stats:', error.message);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch code analysis stats',
      });
    }
  });
};

export default codeAnalysisSimpleRoutes;
