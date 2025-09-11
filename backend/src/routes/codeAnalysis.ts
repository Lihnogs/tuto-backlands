import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';

const CodeAnalysisSchema = z.object({
  code: z.string().min(1),
  language: z.string().min(1),
  score: z.number().int().min(0).max(100),
  feedback: z.array(z.string()),
  suggestions: z.array(z.string()),
});

const codeAnalysisRoutes: FastifyPluginAsync = async (fastify) => {
  // Get code analyses for user
  fastify.get('/', {
    preHandler: [authenticate],
    schema: {
      description: 'Get code analyses for current user',
      tags: ['code-analysis'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
          offset: { type: 'number', minimum: 0, default: 0 },
          language: { type: 'string' },
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
  }, async (request, reply) => {
    try {
      const { limit = 20, offset = 0, language } = request.query as { 
        limit?: number; 
        offset?: number; 
        language?: string 
      };
      const userId = request.user.id;

      let query = fastify.db`
        SELECT id, user_id, code, language, score, feedback, suggestions, created_at
        FROM code_analyses
        WHERE user_id = ${userId}
      `;

      if (language) {
        query = fastify.db`
          SELECT id, user_id, code, language, score, feedback, suggestions, created_at
          FROM code_analyses
          WHERE user_id = ${userId} AND language = ${language}
        `;
      }

      const analyses = await fastify.db`
        ${query}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      return reply.send(analyses);
    } catch (error) {
      fastify.log.error('Error fetching code analyses:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch code analyses',
      });
    }
  });

  // Get specific code analysis
  fastify.get('/:id', {
    preHandler: [authenticate],
    schema: {
      description: 'Get specific code analysis',
      tags: ['code-analysis'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            user_id: { type: 'string' },
            code: { type: 'string' },
            language: { type: 'string' },
            score: { type: 'number' },
            feedback: { type: 'array', items: { type: 'string' } },
            suggestions: { type: 'array', items: { type: 'string' } },
            created_at: { type: 'string' },
          },
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
      const userId = request.user.id;

      const analyses = await fastify.db`
        SELECT id, user_id, code, language, score, feedback, suggestions, created_at
        FROM code_analyses
        WHERE id = ${id} AND user_id = ${userId}
      `;

      if (analyses.length === 0) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Code analysis not found or not authorized',
        });
      }

      return reply.send(analyses[0]);
    } catch (error) {
      fastify.log.error('Error fetching code analysis:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch code analysis',
      });
    }
  });

  // Create new code analysis
  fastify.post('/', {
    preHandler: [authenticate],
    schema: {
      description: 'Create a new code analysis',
      tags: ['code-analysis'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['code', 'language', 'score', 'feedback', 'suggestions'],
        properties: {
          code: { type: 'string', minLength: 1 },
          language: { type: 'string', minLength: 1 },
          score: { type: 'number', minimum: 0, maximum: 100 },
          feedback: { type: 'array', items: { type: 'string' } },
          suggestions: { type: 'array', items: { type: 'string' } },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            user_id: { type: 'string' },
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
  }, async (request, reply) => {
    try {
      const analysisData = CodeAnalysisSchema.parse(request.body);
      const userId = request.user.id;

      const result = await fastify.db`
        INSERT INTO code_analyses (user_id, code, language, score, feedback, suggestions)
        VALUES (${userId}, ${analysisData.code}, ${analysisData.language}, ${analysisData.score}, ${analysisData.feedback}, ${analysisData.suggestions})
        RETURNING id, user_id, code, language, score, feedback, suggestions, created_at
      `;

      return reply.status(201).send(result[0]);
    } catch (error) {
      fastify.log.error('Error creating code analysis:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to create code analysis',
      });
    }
  });

  // Delete code analysis
  fastify.delete('/:id', {
    preHandler: [authenticate],
    schema: {
      description: 'Delete a code analysis',
      tags: ['code-analysis'],
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
      const userId = request.user.id;

      const result = await fastify.db`
        DELETE FROM code_analyses 
        WHERE id = ${id} AND user_id = ${userId}
      `;

      if (result.length === 0) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Code analysis not found or not authorized',
        });
      }

      return reply.status(204).send();
    } catch (error) {
      fastify.log.error('Error deleting code analysis:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to delete code analysis',
      });
    }
  });

  // Get user statistics
  fastify.get('/stats/summary', {
    preHandler: [authenticate],
    schema: {
      description: 'Get code analysis statistics for current user',
      tags: ['code-analysis'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            total_analyses: { type: 'number' },
            average_score: { type: 'number' },
            languages_used: { type: 'array', items: { type: 'string' } },
            recent_analyses: { type: 'array', items: { type: 'object' } },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const userId = request.user.id;

      // Get total analyses
      const totalResult = await fastify.db`
        SELECT COUNT(*) as total FROM code_analyses WHERE user_id = ${userId}
      `;
      const totalAnalyses = parseInt(totalResult[0].total);

      // Get average score
      const avgResult = await fastify.db`
        SELECT AVG(score) as average FROM code_analyses WHERE user_id = ${userId}
      `;
      const averageScore = avgResult[0].average ? parseFloat(avgResult[0].average) : 0;

      // Get languages used
      const languagesResult = await fastify.db`
        SELECT DISTINCT language FROM code_analyses WHERE user_id = ${userId}
      `;
      const languagesUsed = languagesResult.map(row => row.language);

      // Get recent analyses
      const recentAnalyses = await fastify.db`
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
        recent_analyses: recentAnalyses,
      });
    } catch (error) {
      fastify.log.error('Error fetching code analysis stats:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch code analysis statistics',
      });
    }
  });
};

export default codeAnalysisRoutes;
