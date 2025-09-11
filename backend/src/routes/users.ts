import { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../middleware/auth.js';
import { neon } from '@neondatabase/serverless';

const usersRoutes: FastifyPluginAsync = async (fastify) => {
  // Atualizar dados do usuário
  fastify.put('/profile', {
    preHandler: [authenticate],
    schema: {
      description: 'Update user profile',
      tags: ['users'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1 },
          email: { type: 'string', format: 'email' },
          address: { type: 'string' },
          neighborhood: { type: 'string' },
          city: { type: 'string' },
          phone: { type: 'string' },
        },
        required: ['name', 'email'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                email: { type: 'string' },
                address: { type: 'string' },
                neighborhood: { type: 'string' },
                city: { type: 'string' },
                phone: { type: 'string' },
                avatar_url: { type: 'string' },
                created_at: { type: 'string' },
                updated_at: { type: 'string' },
              },
            },
            message: { type: 'string' },
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
      const currentUser = (request as any).user;
      const updateData = request.body as {
        name: string;
        email: string;
        address?: string;
        neighborhood?: string;
        city?: string;
        phone?: string;
      };

      const connectionString = process.env.DATABASE_URL;
      if (!connectionString) {
        throw new Error('DATABASE_URL not found');
      }

      const sql = neon(connectionString);

      // Verificar se o email já existe (exceto para o usuário atual)
      const existingUser = await sql`
        SELECT id FROM users 
        WHERE email = ${updateData.email} AND id != ${currentUser.id}
      `;

      if (existingUser.length > 0) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Email já está em uso por outro usuário',
        });
      }

      // Atualizar dados do usuário
      const updatedUser = await sql`
        UPDATE users 
        SET 
          name = ${updateData.name},
          email = ${updateData.email},
          address = ${updateData.address || null},
          neighborhood = ${updateData.neighborhood || null},
          city = ${updateData.city || null},
          phone = ${updateData.phone || null},
          updated_at = NOW()
        WHERE id = ${currentUser.id}
        RETURNING *
      `;

      if (updatedUser.length === 0) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Usuário não encontrado',
        });
      }

      const user = updatedUser[0];

      return reply.send({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          address: user.address,
          neighborhood: user.neighborhood,
          city: user.city,
          phone: user.phone,
          avatar_url: user.avatar_url,
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
        message: 'Perfil atualizado com sucesso',
      });
    } catch (error: any) {
      fastify.log.error('Error updating user profile:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao atualizar perfil',
      });
    }
  });

  // Alterar senha
  fastify.put('/password', {
    preHandler: [authenticate],
    schema: {
      description: 'Change user password',
      tags: ['users'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          currentPassword: { type: 'string', minLength: 1 },
          newPassword: { type: 'string', minLength: 6 },
        },
        required: ['currentPassword', 'newPassword'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
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
      const currentUser = (request as any).user;
      const { currentPassword, newPassword } = request.body as {
        currentPassword: string;
        newPassword: string;
      };

      const connectionString = process.env.DATABASE_URL;
      if (!connectionString) {
        throw new Error('DATABASE_URL not found');
      }

      const sql = neon(connectionString);

      // Buscar usuário com senha atual
      const user = await sql`
        SELECT password_hash FROM users WHERE id = ${currentUser.id}
      `;

      if (user.length === 0) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Usuário não encontrado',
        });
      }

      // Verificar senha atual
      const bcrypt = await import('bcryptjs');
      const isCurrentPasswordValid = await bcrypt.default.compare(currentPassword, user[0].password_hash);

      if (!isCurrentPasswordValid) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Senha atual incorreta',
        });
      }

      // Hash da nova senha
      const hashedNewPassword = await bcrypt.default.hash(newPassword, 10);

      // Atualizar senha
      await sql`
        UPDATE users 
        SET password_hash = ${hashedNewPassword}, updated_at = NOW()
        WHERE id = ${currentUser.id}
      `;

      return reply.send({
        success: true,
        message: 'Senha alterada com sucesso',
      });
    } catch (error: any) {
      fastify.log.error('Error changing password:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao alterar senha',
      });
    }
  });

  // Excluir conta
  fastify.delete('/account', {
    preHandler: [authenticate],
    schema: {
      description: 'Delete user account',
      tags: ['users'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          password: { type: 'string', minLength: 1 },
        },
        required: ['password'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
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
      const currentUser = (request as any).user;
      const { password } = request.body as { password: string };

      const connectionString = process.env.DATABASE_URL;
      if (!connectionString) {
        throw new Error('DATABASE_URL not found');
      }

      const sql = neon(connectionString);

      // Buscar usuário com senha
      const user = await sql`
        SELECT password_hash FROM users WHERE id = ${currentUser.id}
      `;

      if (user.length === 0) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Usuário não encontrado',
        });
      }

      // Verificar senha
      const bcrypt = await import('bcryptjs');
      const isPasswordValid = await bcrypt.default.compare(password, user[0].password_hash);

      if (!isPasswordValid) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Senha incorreta',
        });
      }

      // Excluir usuário
      await sql`
        DELETE FROM users WHERE id = ${currentUser.id}
      `;

      return reply.send({
        success: true,
        message: 'Conta excluída com sucesso',
      });
    } catch (error: any) {
      fastify.log.error('Error deleting account:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao excluir conta',
      });
    }
  });
};

export default usersRoutes;
