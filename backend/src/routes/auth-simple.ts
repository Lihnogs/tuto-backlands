import { FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const authSimpleRoutes: FastifyPluginAsync = async (fastify) => {
  // Register user - Versão simplificada
  fastify.post('/register', {
    schema: {
      description: 'Register a new user (simplified version)',
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['email', 'password', 'name'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
          name: { type: 'string', minLength: 2 },
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
                created_at: { type: 'string' },
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
      console.log('Registration request received:', request.body);
      
      const { email, password, name } = request.body as any;
      
      // Validação básica
      if (!email || !password || !name) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Email, password and name are required',
        });
      }

      // Verificar se usuário já existe
      const existingUser = await fastify.db`
        SELECT id FROM users WHERE email = ${email}
      `;

      if (Array.isArray(existingUser) && existingUser.length > 0) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'User already exists with this email',
        });
      }

      // Hash da senha
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Criar usuário
      const result = await fastify.db`
        INSERT INTO users (email, password_hash, name)
        VALUES (${email}, ${passwordHash}, ${name})
        RETURNING id, email, name, created_at
      `;

      const user = result[0];
      console.log('User created successfully:', user.id);

      // Gerar token JWT
      const secret = process.env.JWT_SECRET || 'your-secret-key';
      const token = jwt.sign({ userId: user.id }, secret, { expiresIn: '7d' });

      return reply.status(201).send({
        user,
        token,
      });
    } catch (error: any) {
      console.error('Registration error:', error.message);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to register user',
      });
    }
  });

  // Login user - Versão simplificada
  fastify.post('/login', {
    schema: {
      description: 'Login user (simplified version)',
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
                created_at: { type: 'string' },
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
      const { email, password } = request.body as any;

      // Buscar usuário
      const users = await fastify.db`
        SELECT * FROM users WHERE email = ${email}
      `;

      if (!Array.isArray(users) || users.length === 0) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid email or password',
        });
      }

      const user = users[0] as any;

      // Verificar senha
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid email or password',
        });
      }

      // Gerar token
      const secret = process.env.JWT_SECRET || 'your-secret-key';
      const token = jwt.sign({ userId: user.id }, secret, { expiresIn: '7d' });

      // Retornar dados do usuário sem senha
      const { password_hash, ...userWithoutPassword } = user;
      
      return reply.send({
        user: userWithoutPassword,
        token,
      });
    } catch (error: any) {
      console.error('Login error:', error.message);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to login',
      });
    }
  });

  // Get current user - Versão simplificada
  fastify.get('/me', {
    schema: {
      description: 'Get current user information (simplified version)',
      tags: ['auth'],
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
                created_at: { type: 'string' },
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
    try {
      // Verificar token do header Authorization
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Token is required',
        });
      }

      const token = authHeader.substring(7);
      const secret = process.env.JWT_SECRET || 'your-secret-key';
      
      try {
        const decoded = jwt.verify(token, secret) as any;
        const userId = decoded.userId;

        // Buscar usuário
        const users = await fastify.db`
          SELECT id, email, name, created_at
          FROM users WHERE id = ${userId}
        `;

        if (!Array.isArray(users) || users.length === 0) {
          return reply.status(401).send({
            error: 'Unauthorized',
            message: 'User not found',
          });
        }

        return reply.send({
          user: users[0],
        });
      } catch (jwtError) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid token',
        });
      }
    } catch (error: any) {
      console.error('Get current user error:', error.message);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get current user',
      });
    }
  });
};

export default authSimpleRoutes;
