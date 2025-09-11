import { FastifyPluginAsync } from 'fastify';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const authWorkingRoutes: FastifyPluginAsync = async (fastify) => {
  // Criar conexão direta com o banco
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/code_tutor';
  const sql = neon(connectionString);

  // Register user - Versão que funciona
  fastify.post('/register', {
    schema: {
      description: 'Register a new user (working version)',
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
      const existingUser = await sql`
        SELECT id FROM users WHERE email = ${email}
      `;

      if (existingUser.length > 0) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'User already exists with this email',
        });
      }

      // Hash da senha
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Avatar padrão
      const defaultAvatarUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNTAiIGZpbGw9IiNFNUU3RUIiLz4KICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjM1IiByPSIxNSIgZmlsbD0iIzlDQTNBRiIvPgogIDxwYXRoIGQ9Ik0yNSA3NUMyNSA2MCAzNiA1MCA1MCA1MEM2NCA1MCA3NSA2MCA3NSA3NSIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K';

      // Criar usuário
      const result = await sql`
        INSERT INTO users (email, password_hash, name, avatar_url)
        VALUES (${email}, ${passwordHash}, ${name}, ${defaultAvatarUrl})
        RETURNING id, email, name, avatar_url, created_at
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

  // Login user - Versão que funciona
  fastify.post('/login', {
    schema: {
      description: 'Login user (working version)',
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
      const users = await sql`
        SELECT id, email, name, password_hash, avatar_url, created_at FROM users WHERE email = ${email}
      `;

      if (users.length === 0) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid email or password',
        });
      }

      const user = users[0];

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

  // Get current user - Versão que funciona
  fastify.get('/me', {
    schema: {
      description: 'Get current user information (working version)',
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
                avatar_url: { type: 'string' },
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
        const users = await sql`
          SELECT id, email, name, avatar_url, created_at
          FROM users WHERE id = ${userId}
        `;

        if (users.length === 0) {
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

export default authWorkingRoutes;
