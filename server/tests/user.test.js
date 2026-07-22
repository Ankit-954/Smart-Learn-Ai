import { describe, test, expect, jest } from '@jest/globals';

// Mock mongoose properly for ESM - must be hoisted
jest.mock('mongoose', () => ({
  Schema: class Schema {},
  model: jest.fn(() => ({})),
  Types: {
    ObjectId: class ObjectId {},
  },
  connect: jest.fn(),
  disconnect: jest.fn(),
}));

import mongoose from 'mongoose';
import { User } from '../models/User.js';

describe('User Model', () => {
  // Sample user data for testing
  const sampleUserData = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'hashedPassword123',
    phone: '1234567890',
    country: 'USA',
    role: 'user',
  };

  describe('Schema Validation', () => {
    test('should create a user with valid data', async () => {
      const user = new User(sampleUserData);
      expect(user).toBeDefined();
      expect(user.name).toBe('Test User');
      expect(user.email).toBe('test@example.com');
      expect(user.role).toBe('user');
    });

    test('should fail without required name field', async () => {
      const userData = { ...sampleUserData, name: undefined };
      const user = new User(userData);
      let error;
      try {
        await user.validate();
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error.errors.name).toBeDefined();
    });

    test('should fail without required email field', async () => {
      const userData = { ...sampleUserData, email: undefined };
      const user = new User(userData);
      let error;
      try {
        await user.validate();
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error.errors.email).toBeDefined();
    });

    test('should fail without required password field', async () => {
      const userData = { ...sampleUserData, password: undefined };
      const user = new User(userData);
      let error;
      try {
        await user.validate();
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error.errors.password).toBeDefined();
    });

    test('should have default role as "user"', async () => {
      const userData = {
        name: 'Default Role User',
        email: 'default@example.com',
        password: 'password123',
      };
      const user = new User(userData);
      expect(user.role).toBe('user');
      expect(user.mainrole).toBe('user');
    });

    test('should have default empty strings for optional fields', async () => {
      const userData = {
        name: 'Minimal User',
        email: 'minimal@example.com',
        password: 'password123',
      };
      const user = new User(userData);
      expect(user.photo).toBe('');
      expect(user.phone).toBe('');
      expect(user.country).toBe('');
      expect(user.address).toBe('');
      expect(user.education).toBe('');
    });

    test('should accept subscription array with Course ObjectIds', async () => {
      const mockCourseId = new mongoose.Types.ObjectId();
      const userData = {
        ...sampleUserData,
        subscription: [mockCourseId],
      };
      const user = new User(userData);
      expect(user.subscription).toHaveLength(1);
      expect(user.subscription[0]).toEqual(mockCourseId);
    });

    test('should accept testHistory array with valid structure', async () => {
      const userData = {
        ...sampleUserData,
        testHistory: [
          {
            domain: 'React',
            score: 85,
            totalQuestions: 100,
            percentage: 85,
          },
        ],
      };
      const user = new User(userData);
      expect(user.testHistory).toHaveLength(1);
      expect(user.testHistory[0].domain).toBe('React');
      expect(user.testHistory[0].score).toBe(85);
    });

    test('should set timestamps automatically', async () => {
      const user = new User(sampleUserData);
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
    });
  });

  describe('Email Uniqueness', () => {
    test('should validate unique email constraint in schema', () => {
      const schema = User.schema;
      const emailPath = schema.path('email');
      expect(emailPath.options.unique).toBe(true);
    });
  });

  describe('resetPasswordExpire Field', () => {
    test('should accept Date type for resetPasswordExpire', async () => {
      const futureDate = new Date(Date.now() + 3600000); // 1 hour from now
      const userData = {
        ...sampleUserData,
        resetPasswordExpire: futureDate,
      };
      const user = new User(userData);
      expect(user.resetPasswordExpire).toEqual(futureDate);
    });
  });
});
