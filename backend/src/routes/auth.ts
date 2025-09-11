import { FastifyPluginAsync } from 'fastify';
import { UserSchema, UserLoginSchema } from '../models/User.js';
import { AuthService } from '../services/authService.js';
import { authenticate } from '../middleware/auth.js';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  const authService = new AuthService(fastify);

  // Register user
  fastify.post('/register', {
    schema: {
      description: 'Register a new user',
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['email', 'password', 'name'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
          name: { type: 'string', minLength: 2 },
          avatar_url: { type: 'string', format: 'uri' },
          level: { type: 'number', minimum: 1, default: 1 },
          xp: { type: 'number', minimum: 0, default: 0 },
          completed_exercises: { type: 'number', minimum: 0, default: 0 },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                name: { type: 'string' },
                avatar_url: { type: 'string' },
                level: { type: 'number' },
                xp: { type: 'number' },
                completed_exercises: { type: 'number' },
                created_at: { type: 'string' },
                updated_at: { type: 'string' },
              },
            },
            token: { type: 'string' },
          },
        },
        400: {
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
      fastify.log.info('Registration request received:', request.body);
      
      fastify.log.info('Validating request body with Zod...');
      const userData = UserSchema.parse(request.body);
      fastify.log.info('Request body validated successfully');
      
      fastify.log.info('Calling authService.register...');
      const user = await authService.register(userData);
      fastify.log.info('User registered successfully');
      
      fastify.log.info('Generating JWT token...');
      const token = authService.generateToken(user.id!);
      fastify.log.info('Token generated successfully');

      return reply.status(201).send({
        user,
        token,
      });
    } catch (error: any) {
      fastify.log.error('Registration error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      if (error.message === 'User already exists with this email') {
        return reply.status(400).send({
          error: 'Bad Request',
          message: error.message,
        });
      }

      fastify.log.error('Registration error:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to register user',
      });
    }
  });

  // Login user
  fastify.post('/login', {
    schema: {
      description: 'Login user',
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
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
                avatar_url: { type: 'string' },
                level: { type: 'number' },
                xp: { type: 'number' },
                completed_exercises: { type: 'number' },
                created_at: { type: 'string' },
                updated_at: { type: 'string' },
              },
            },
            token: { type: 'string' },
          },
        },
        401: {
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
      const loginData = UserLoginSchema.parse(request.body);
      const result = await authService.login(loginData);

      return reply.send(result);
    } catch (error: any) {
      if (error.message === 'Invalid email or password') {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: error.message,
        });
      }

      fastify.log.error('Login error:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to login',
      });
    }
  });

  // Get current user
  fastify.get('/me', {
    preHandler: [authenticate],
    schema: {
      description: 'Get current user information',
      tags: ['auth'],
      security: [{ bearerAuth: [] }],
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
                avatar_url: { type: 'string' },
                level: { type: 'number' },
                xp: { type: 'number' },
                completed_exercises: { type: 'number' },
                created_at: { type: 'string' },
                updated_at: { type: 'string' },
              },
            },
          },
        },
        401: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    return reply.send({
      user: request.user,
    });
  });
};

export default authRoutes;
