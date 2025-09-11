import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import dotenv from 'dotenv';

// Import routes
import authWorkingRoutes from './routes/auth-working.ts';
import usersRoutes from './routes/users.ts';
import chatSimpleRoutes from './routes/chat-simple.ts';
import codeAnalysisSimpleRoutes from './routes/code-analysis-simple.ts';
import uploadRoutes from './routes/upload.ts';

// Import plugins
import { dbPlugin } from './plugins/database.ts';
import { swaggerOptions, swaggerUiOptions } from './utils/swagger.ts';
import { authenticateSimple } from './middleware/auth-simple.ts';

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
  await fastify.register(uploadRoutes, { prefix: '/upload' });

  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  return fastify;
}
