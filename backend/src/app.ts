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
import uploadSimpleRoutes from './routes/upload-simple.js';

// Import plugins
import { dbPlugin } from './plugins/database.js';
import { swaggerOptions, swaggerUiOptions } from './utils/swagger.js';
import { authenticateSimple } from './middleware/auth-simple.js';

dotenv.config({ path: '.env' });

export async function buildApp() {
  const fastify = Fastify({
    logger: false, // logger desligado no serverless
  });

  await fastify.register(cors, { origin: true, credentials: true });
  await fastify.register(jwt, { secret: process.env.JWT_SECRET || 'your-secret-key' });
  await fastify.register(swagger, swaggerOptions);
  await fastify.register(swaggerUi, swaggerUiOptions);
  await fastify.register(dbPlugin);

  fastify.decorate('authenticate', authenticateSimple);

  await fastify.register(authWorkingRoutes, { prefix: '/auth' });
  await fastify.register(usersRoutes, { prefix: '/users' });
  await fastify.register(chatSimpleRoutes, { prefix: '/chat' });
  await fastify.register(codeAnalysisSimpleRoutes, { prefix: '/code-analysis' });
  await fastify.register(uploadSimpleRoutes, { prefix: '/upload' });

  // Rota raiz
  fastify.get('/', async () => {
    return { 
      message: '🚀 Code Tutor Backend API está funcionando!',
      status: 'ok', 
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      endpoints: {
        health: '/health',
        auth: '/auth',
        users: '/users',
        chat: '/chat',
        upload: '/upload',
        docs: '/documentation'
      }
    };
  });

  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  return fastify;
}
