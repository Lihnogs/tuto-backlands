import { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../middleware/auth.js';
import { neon } from '@neondatabase/serverless';
import multer from '@fastify/multipart';
import fs from 'fs';
import path from 'path';

const uploadRoutes: FastifyPluginAsync = async (fastify) => {
  // Registrar o plugin multipart para upload de arquivos
  await fastify.register(multer);

  // Criar diretório de uploads se não existir
  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

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

      // Validar tamanho do arquivo (máximo 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (data.file.bytesRead > maxSize) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'File too large. Maximum size is 5MB.',
        });
      }

      // Gerar nome único para o arquivo
      const fileExtension = path.extname(data.filename);
      const fileName = `${currentUser.id}-${Date.now()}${fileExtension}`;
      const filePath = path.join(uploadDir, fileName);

      // Salvar arquivo
      const buffer = await data.toBuffer();
      fs.writeFileSync(filePath, buffer);

      // Gerar URL do arquivo
      const baseUrl = process.env.BACKEND_URL || 'http://localhost:3000';
      const avatarUrl = `${baseUrl}/uploads/${fileName}`;

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
      });
    } catch (error: any) {
      fastify.log.error('Error uploading profile photo:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to upload profile photo',
      });
    }
  });

  // Servir arquivos estáticos
  fastify.get('/uploads/:filename', async (request, reply) => {
    const { filename } = request.params as { filename: string };
    const filePath = path.join(uploadDir, filename);

    if (!fs.existsSync(filePath)) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'File not found',
      });
    }

    // Determinar o tipo MIME baseado na extensão
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';
    reply.header('Content-Type', contentType);
    reply.header('Cache-Control', 'public, max-age=31536000'); // Cache por 1 ano

    const stream = fs.createReadStream(filePath);
    return reply.send(stream);
  });
};

export default uploadRoutes;
