import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { FastifyInstance } from 'fastify';
import { User, UserLogin } from '../models/User.js';

export class AuthService {
  constructor(private fastify: FastifyInstance) {}

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  generateToken(userId: string): string {
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    
    return jwt.sign({ userId }, secret, { expiresIn });
  }

  verifyToken(token: string): { userId: string } {
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    return jwt.verify(token, secret) as { userId: string };
  }

  async register(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<Omit<User, 'password'>> {
    try {
      console.log('Starting user registration...');
      const { email, password, name, avatar_url, level, xp, completed_exercises } = userData;

      const connectionString = process.env.DATABASE_URL;
      if (!connectionString) {
        throw new Error('DATABASE_URL not found');
      }

      const { neon } = await import('@neondatabase/serverless');
      const sql = neon(connectionString);

      console.log('Checking if user already exists...');
      // Check if user already exists
      const existingUser = await sql`
        SELECT id FROM users WHERE email = ${email}
      `;

      if (existingUser.length > 0) {
        console.log('User already exists with email:', email);
        throw new Error('User already exists with this email');
      }

      console.log('Hashing password...');
      // Hash password
      const passwordHash = await this.hashPassword(password);

      console.log('Creating user in database...');
      // Create user
      const result = await sql`
        INSERT INTO users (email, password_hash, name, avatar_url, level, xp, completed_exercises)
        VALUES (${email}, ${passwordHash}, ${name}, ${avatar_url}, ${level}, ${xp}, ${completed_exercises})
        RETURNING id, email, name, avatar_url, level, xp, completed_exercises, created_at, updated_at
      `;

      console.log('User created successfully:', result[0].id);
      return result[0];
    } catch (error) {
      console.error('Error in register method:', error);
      throw error;
    }
  }

  async login(loginData: UserLogin): Promise<{ user: Omit<User, 'password'>; token: string }> {
    const { email, password } = loginData;

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL not found');
    }

    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(connectionString);

    // Find user by email
    const users = await sql`
      SELECT * FROM users WHERE email = ${email}
    `;

    if (users.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = users[0];

    // Verify password
    const isValidPassword = await this.comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Generate token
    const token = this.generateToken(user.id);

    // Return user data without password
    const { password_hash, ...userWithoutPassword } = user;
    
    return {
      user: userWithoutPassword,
      token,
    };
  }

  async getCurrentUser(userId: string): Promise<Omit<User, 'password'> | null> {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL not found');
    }

    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(connectionString);

    const users = await sql`
      SELECT id, email, name, avatar_url, level, xp, completed_exercises, created_at, updated_at
      FROM users WHERE id = ${userId}
    `;

    return users.length > 0 ? users[0] as Omit<User, 'password'> : null;
  }
}
