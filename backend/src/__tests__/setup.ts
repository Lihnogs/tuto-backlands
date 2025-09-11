import dotenv from 'dotenv';

// Load test environment variables (fallback to .env if .env.test doesn't exist)
dotenv.config({ path: '.env.test' });
dotenv.config(); // Fallback to .env

// Set test environment
process.env.NODE_ENV = 'test';

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };

beforeAll(() => {
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
});

afterAll(() => {
  global.console = originalConsole;
});
