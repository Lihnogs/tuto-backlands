import { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../middleware/auth.js';
import { neon } from '@neondatabase/serverless';
import multer from '@fastify/multipart';

// Armazenamento temporário em memória para Vercel
const fileStorage = new Map<string, { buffer: Buffer; mimeType: string; uploadedAt: number }>();

// Limpeza automática de arquivos antigos (mais de 1 hora)
const cleanupOldFiles = () => {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  for (const [key, value] of fileStorage.entries()) {
    if (value.uploadedAt < oneHourAgo) {
      fileStorage.delete(key);
    }
  }
};

// Executar limpeza a cada 30 minutos
setInterval(cleanupOldFiles, 30 * 60 * 1000);

const uploadSimpleRoutes: FastifyPluginAsync = async (fastify) => {
  // Registrar o plugin multipart para upload de arquivos
  await fastify.register(multer);

  // Upload de foto de perfil
  fastify.post('/profile-photo', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const currentUser = (request as any).user;
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'No file uploaded',
        });
      }

      // Validar tipo de arquivo
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(data.mimetype)) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Invalid file type. Only JPEG, PNG and GIF are allowed.',
        });
      }

      // Validar tamanho do arquivo (máximo 2MB para Vercel)
      const maxSize = 2 * 1024 * 1024; // 2MB
      if (data.file.bytesRead > maxSize) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'File too large. Maximum size is 2MB for Vercel.',
        });
      }

      // Gerar nome único para o arquivo
      const fileExtension = data.filename.split('.').pop() || 'jpg';
      const fileName = `${currentUser.id}-${Date.now()}.${fileExtension}`;

      // Salvar arquivo na memória
      const buffer = await data.toBuffer();
      fileStorage.set(fileName, {
        buffer,
        mimeType: data.mimetype,
        uploadedAt: Date.now()
      });

      // Gerar URL do arquivo
      const baseUrl = process.env.BACKEND_URL || 'http://localhost:3000';
      const avatarUrl = `${baseUrl}/upload/uploads/${fileName}`;

      // Atualizar avatar_url no banco de dados
      const connectionString = process.env.DATABASE_URL;
      if (!connectionString) {
        throw new Error('DATABASE_URL not found');
      }

      const sql = neon(connectionString);
      await sql`
        UPDATE users 
        SET avatar_url = ${avatarUrl}, updated_at = NOW()
        WHERE id = ${currentUser.id}
      `;

      return reply.send({
        success: true,
        avatar_url: avatarUrl,
        message: 'Profile photo uploaded successfully',
        note: 'File stored temporarily in memory (Vercel compatible)'
      });
    } catch (error: any) {
      fastify.log.error('Error uploading profile photo:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to upload profile photo',
        details: error.message
      });
    }
  });

  // Servir arquivos estáticos da memória
  fastify.get('/uploads/:filename', async (request, reply) => {
    const { filename } = request.params as { filename: string };
    
    // Buscar arquivo no armazenamento em memória
    const fileData = fileStorage.get(filename);
    
    if (!fileData) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'File not found or expired',
      });
    }

    // Verificar se o arquivo não expirou (1 hora)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    if (fileData.uploadedAt < oneHourAgo) {
      fileStorage.delete(filename);
      return reply.status(404).send({
        error: 'Not Found',
        message: 'File expired',
      });
    }

    reply.header('Content-Type', fileData.mimeType);
    reply.header('Cache-Control', 'public, max-age=1800'); // Cache por 30 minutos
    reply.header('Content-Length', fileData.buffer.length.toString());

    return reply.send(fileData.buffer);
  });

  // Endpoint para listar arquivos (debug)
  fastify.get('/debug/files', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    const files = Array.from(fileStorage.keys()).map(filename => {
      const data = fileStorage.get(filename);
      return {
        filename,
        size: data?.buffer.length || 0,
        mimeType: data?.mimeType || 'unknown',
        uploadedAt: data?.uploadedAt || 0
      };
    });

    return reply.send({
      totalFiles: files.length,
      files
    });
  });
};

export default uploadSimpleRoutes;
