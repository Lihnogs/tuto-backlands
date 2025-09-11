import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import dotenv from 'dotenv';

// Import routes
import authWorkingRoutes from './routes/auth-working.js';
import usersRoutes from './routes/users.js';
import chatSimpleRoutes from './routes/chat-simple.js';
import codeAnalysisSimpleRoutes from './routes/code-analysis-simple.js';
import uploadRoutes from './routes/upload.js';

// Import plugins
import { dbPlugin } from './plugins/database.js';

// Import utils
import { swaggerOptions, swaggerUiOptions } from './utils/swagger.js';

// Load environment variables
dotenv.config({ path: '.env' });

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
});

// Register plugins
await fastify.register(cors, {
  origin: true, // Permitir todas as origens em desenvolvimento
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
});

await fastify.register(jwt, {
  secret: process.env.JWT_SECRET || 'your-secret-key',
});

await fastify.register(swagger, swaggerOptions);

await fastify.register(swaggerUi, swaggerUiOptions);

// Register database plugin
await fastify.register(dbPlugin);

// Register authentication middleware
import { authenticateSimple } from './middleware/auth-simple.js';
fastify.decorate('authenticate', authenticateSimple);

// Register routes
await fastify.register(authWorkingRoutes, { prefix: '/auth' });
await fastify.register(usersRoutes, { prefix: '/users' });
await fastify.register(chatSimpleRoutes, { prefix: '/chat' });
await fastify.register(codeAnalysisSimpleRoutes, { prefix: '/code-analysis' });
await fastify.register(uploadRoutes, { prefix: '/upload' });

// Health check endpoint
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Debug endpoint (only in development)
if (process.env.NODE_ENV !== 'production') {
  fastify.get('/debug/env', async () => {
    return {
      DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Not set',
      JWT_SECRET: process.env.JWT_SECRET ? 'Set' : 'Not set',
      PORT: process.env.PORT,
      HOST: process.env.HOST,
      FRONTEND_URL: process.env.FRONTEND_URL,
      NODE_ENV: process.env.NODE_ENV
    };
  });
}

// Start server
export default fastify;
