import { z } from 'zod';

// User schema for validation
export const UserSchema = z.object({
  id: z.string().uuid().optional(),
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  avatar_url: z.string().url().optional(),
  level: z.number().int().min(1).default(1),
  xp: z.number().int().min(0).default(0),
  completed_exercises: z.number().int().min(0).default(0),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
});

export const UserLoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const UserUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  avatar_url: z.string().url().optional(),
  level: z.number().int().min(1).optional(),
  xp: z.number().int().min(0).optional(),
  completed_exercises: z.number().int().min(0).optional(),
});

// TypeScript types
export type User = z.infer<typeof UserSchema>;
export type UserLogin = z.infer<typeof UserLoginSchema>;
export type UserUpdate = z.infer<typeof UserUpdateSchema>;

// Database queries
export const UserQueries = {
  create: `
    INSERT INTO users (email, password_hash, name, avatar_url, level, xp, completed_exercises)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `,
  
  findByEmail: `
    SELECT * FROM users WHERE email = $1
  `,
  
  findById: `
    SELECT * FROM users WHERE id = $1
  `,
  
  update: `
    UPDATE users 
    SET name = COALESCE($2, name),
        avatar_url = COALESCE($3, avatar_url),
        level = COALESCE($4, level),
        xp = COALESCE($5, xp),
        completed_exercises = COALESCE($6, completed_exercises),
        updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `,
  
  delete: `
    DELETE FROM users WHERE id = $1
  `,
  
  getAll: `
    SELECT id, email, name, avatar_url, level, xp, completed_exercises, created_at, updated_at 
    FROM users 
    ORDER BY created_at DESC
  `,
};
