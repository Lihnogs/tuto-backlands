import { AuthService } from '../../services/authService.js';
import { FastifyInstance } from 'fastify';

// Mock Fastify instance
const mockFastify = {
  db: {
    // Mock database queries
  },
  log: {
    error: jest.fn(),
    info: jest.fn(),
  },
} as unknown as FastifyInstance;

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService(mockFastify);
  });

  describe('hashPassword', () => {
    it('should hash password correctly', async () => {
      const password = 'testpassword123';
      const hash = await authService.hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'testpassword123';
      const hash1 = await authService.hashPassword(password);
      const hash2 = await authService.hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('comparePassword', () => {
    it('should return true for correct password', async () => {
      const password = 'testpassword123';
      const hash = await authService.hashPassword(password);
      
      const result = await authService.comparePassword(password, hash);
      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const password = 'testpassword123';
      const hash = await authService.hashPassword(password);
      
      const result = await authService.comparePassword('wrongpassword', hash);
      expect(result).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const userId = 'test-user-id';
      const token = authService.generateToken(userId);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const userId = 'test-user-id';
      const token = authService.generateToken(userId);
      
      const decoded = authService.verifyToken(token);
      expect(decoded.userId).toBe(userId);
    });

    it('should throw error for invalid token', () => {
      expect(() => {
        authService.verifyToken('invalid-token');
      }).toThrow();
    });
  });
});
