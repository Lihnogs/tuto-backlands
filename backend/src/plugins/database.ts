import { neon } from '@neondatabase/serverless';
import { FastifyPluginAsync } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    db: ReturnType<typeof neon>;
  }
}

export const dbPlugin: FastifyPluginAsync = async (fastify) => {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/code_tutor';
  
  if (!connectionString) {
    fastify.log.warn('⚠️ DATABASE_URL not set, using fallback connection string');
  }

  const sql = neon(connectionString);

  // Decorate fastify with database connection
  fastify.decorate('db', sql);

  // Test database connection (but don't fail if it doesn't work)
  try {
    await sql`SELECT 1`;
    fastify.log.info('✅ Database connection established');
  } catch (error) {
    fastify.log.warn('⚠️ Database connection failed, but server will continue running');
    fastify.log.warn('   You can set up a database later and restart the server');
    fastify.log.warn('   For now, API endpoints that require database will return errors');
  }

  // Graceful shutdown
  fastify.addHook('onClose', async () => {
    fastify.log.info('🔌 Database connection closed');
  });
};
