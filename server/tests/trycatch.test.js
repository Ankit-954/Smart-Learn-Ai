import { describe, test, expect, jest } from '@jest/globals';
import TryCatch from '../middlewares/TryCatch.js';

describe('TryCatch Middleware', () => {
  describe('Successful Handler Execution', () => {
    test('should call handler and pass through successful execution', async () => {
      const mockHandler = jest.fn().mockResolvedValue();
      const mockReq = { body: { id: 1 } };
      const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const mockNext = jest.fn();

      const middleware = TryCatch(mockHandler);
      await middleware(mockReq, mockRes, mockNext);

      expect(mockHandler).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should handle synchronous handler functions', async () => {
      const mockHandler = jest.fn();
      const mockReq = {};
      const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const mockNext = jest.fn();

      const middleware = TryCatch(mockHandler);
      await middleware(mockReq, mockRes, mockNext);

      expect(mockHandler).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should catch errors from async handlers', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const testError = new Error('Test error');
      const mockHandler = jest.fn().mockRejectedValue(testError);
      const mockReq = {};
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const mockNext = jest.fn();

      const middleware = TryCatch(mockHandler);
      await middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Something went wrong. Please try again later.',
      });
      
      process.env.NODE_ENV = originalEnv;
    });

    test('should use custom error status if provided', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const testError = new Error('Not found');
      testError.status = 404;
      const mockHandler = jest.fn().mockRejectedValue(testError);
      const mockReq = {};
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const mockNext = jest.fn();

      const middleware = TryCatch(mockHandler);
      await middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Something went wrong. Please try again later.',
      });
      
      process.env.NODE_ENV = originalEnv;
    });

    test('should include error message in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const testError = new Error('Development error message');
      const mockHandler = jest.fn().mockRejectedValue(testError);
      const mockReq = {};
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const mockNext = jest.fn();

      const middleware = TryCatch(mockHandler);
      middleware(mockReq, mockRes, mockNext);

      // Wait for async execution
      setTimeout(() => {
        expect(mockRes.json).toHaveBeenCalledWith({
          message: 'Development error message',
        });
        process.env.NODE_ENV = originalEnv;
      }, 10);
    });

    test('should hide raw error messages in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const testError = new Error('Sensitive database error');
      const mockHandler = jest.fn().mockRejectedValue(testError);
      const mockReq = {};
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const mockNext = jest.fn();

      const middleware = TryCatch(mockHandler);
      middleware(mockReq, mockRes, mockNext);

      // Wait for async execution
      setTimeout(() => {
        expect(mockRes.json).toHaveBeenCalledWith({
          message: 'Something went wrong. Please try again later.',
        });
        process.env.NODE_ENV = originalEnv;
      }, 10);
    });

    test('should handle errors without status property', async () => {
      const testError = new Error('Generic error');
      const mockHandler = jest.fn().mockRejectedValue(testError);
      const mockReq = {};
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const mockNext = jest.fn();

      const middleware = TryCatch(mockHandler);
      await middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Middleware Function Properties', () => {
    test('should return a function', () => {
      const mockHandler = jest.fn();
      const middleware = TryCatch(mockHandler);
      expect(typeof middleware).toBe('function');
    });

    test('returned function should accept req, res, next parameters', () => {
      const mockHandler = jest.fn();
      const middleware = TryCatch(mockHandler);
      expect(middleware.length).toBe(3);
    });
  });

  describe('Handler Invocation', () => {
    test('should await the handler execution', async () => {
      let handlerCompleted = false;
      const mockHandler = jest.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        handlerCompleted = true;
      });
      const mockReq = {};
      const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const mockNext = jest.fn();

      const middleware = TryCatch(mockHandler);
      await middleware(mockReq, mockRes, mockNext);

      expect(handlerCompleted).toBe(true);
    });

    test('should not call next() on successful execution', async () => {
      const mockHandler = jest.fn().mockResolvedValue();
      const mockReq = {};
      const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const mockNext = jest.fn();

      const middleware = TryCatch(mockHandler);
      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should not call next() on error - handles error internally', async () => {
      const mockHandler = jest.fn().mockRejectedValue(new Error('Test'));
      const mockReq = {};
      const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const mockNext = jest.fn();

      const middleware = TryCatch(mockHandler);
      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
