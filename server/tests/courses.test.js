import { describe, test, expect } from '@jest/globals';
import mongoose from 'mongoose';
import { Courses } from '../models/Courses.js';

describe('Courses Model', () => {
  const sampleCourseData = {
    title: 'Complete React Development Bootcamp',
    description: 'Learn React from scratch to advanced concepts',
    image: 'https://example.com/react-course.jpg',
    price: 99.99,
    isFree: false,
    duration: 12,
    durationUnit: 'week',
    category: 'Web Development',
    stream: 'Frontend',
    level: 'All Levels',
    subjects: ['React', 'JavaScript', 'Redux'],
    isTopCourse: true,
    topPriority: 1,
    createdBy: 'Admin',
  };

  describe('Schema Validation', () => {
    test('should create a course with valid data', async () => {
      const course = new Courses(sampleCourseData);
      expect(course).toBeDefined();
      expect(course.title).toBe('Complete React Development Bootcamp');
      expect(course.price).toBe(99.99);
      expect(course.category).toBe('Web Development');
    });

    test('should fail without required title field', async () => {
      const courseData = { ...sampleCourseData, title: undefined };
      const course = new Courses(courseData);
      let error;
      try {
        await course.validate();
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error.errors.title).toBeDefined();
    });

    test('should fail without required description field', async () => {
      const courseData = { ...sampleCourseData, description: undefined };
      const course = new Courses(courseData);
      let error;
      try {
        await course.validate();
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error.errors.description).toBeDefined();
    });

    test('should fail without required price field', async () => {
      const courseData = { ...sampleCourseData, price: undefined };
      const course = new Courses(courseData);
      let error;
      try {
        await course.validate();
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error.errors.price).toBeDefined();
    });

    test('should fail without required duration field', async () => {
      const courseData = { ...sampleCourseData, duration: undefined };
      const course = new Courses(courseData);
      let error;
      try {
        await course.validate();
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error.errors.duration).toBeDefined();
    });

    test('should fail without required category field', async () => {
      const courseData = { ...sampleCourseData, category: undefined };
      const course = new Courses(courseData);
      let error;
      try {
        await course.validate();
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error.errors.category).toBeDefined();
    });

    test('should fail without required createdBy field', async () => {
      const courseData = { ...sampleCourseData, createdBy: undefined };
      const course = new Courses(courseData);
      let error;
      try {
        await course.validate();
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error.errors.createdBy).toBeDefined();
    });

    test('should have default empty string for image', async () => {
      const courseData = {
        ...sampleCourseData,
        image: undefined,
      };
      const course = new Courses(courseData);
      expect(course.image).toBe('');
    });

    test('should have default isFree as false', async () => {
      const courseData = {
        ...sampleCourseData,
        isFree: undefined,
      };
      const course = new Courses(courseData);
      expect(course.isFree).toBe(false);
    });

    test('should have default durationUnit as "week"', async () => {
      const courseData = {
        ...sampleCourseData,
        durationUnit: undefined,
      };
      const course = new Courses(courseData);
      expect(course.durationUnit).toBe('week');
    });

    test('should have default empty string for stream', async () => {
      const courseData = {
        ...sampleCourseData,
        stream: undefined,
      };
      const course = new Courses(courseData);
      expect(course.stream).toBe('');
    });

    test('should have default level as "All Levels"', async () => {
      const courseData = {
        ...sampleCourseData,
        level: undefined,
      };
      const course = new Courses(courseData);
      expect(course.level).toBe('All Levels');
    });

    test('should have default empty array for subjects', async () => {
      const courseData = {
        ...sampleCourseData,
        subjects: undefined,
      };
      const course = new Courses(courseData);
      expect(course.subjects).toEqual([]);
    });

    test('should have default isTopCourse as false', async () => {
      const courseData = {
        ...sampleCourseData,
        isTopCourse: undefined,
      };
      const course = new Courses(courseData);
      expect(course.isTopCourse).toBe(false);
    });

    test('should have default topPriority as 0', async () => {
      const courseData = {
        ...sampleCourseData,
        topPriority: undefined,
      };
      const course = new Courses(courseData);
      expect(course.topPriority).toBe(0);
    });

    test('should validate durationUnit enum values', async () => {
      const validUnits = ['day', 'week', 'month'];
      for (const unit of validUnits) {
        const courseData = { ...sampleCourseData, durationUnit: unit };
        const course = new Courses(courseData);
        let error;
        try {
          await course.validate();
        } catch (err) {
          error = err;
        }
        expect(error).toBeUndefined();
      }
    });

    test('should fail with invalid durationUnit value', async () => {
      const courseData = { ...sampleCourseData, durationUnit: 'year' };
      const course = new Courses(courseData);
      let error;
      try {
        await course.validate();
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error.errors.durationUnit).toBeDefined();
    });

    test('should accept free course with price 0', async () => {
      const courseData = {
        ...sampleCourseData,
        isFree: true,
        price: 0,
      };
      const course = new Courses(courseData);
      expect(course.isFree).toBe(true);
      expect(course.price).toBe(0);
    });

    test('should set createdAt automatically', async () => {
      const course = new Courses(sampleCourseData);
      expect(course.createdAt).toBeDefined();
      expect(course.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('Course Data Integrity', () => {
    test('should handle array of subjects correctly', async () => {
      const courseData = {
        ...sampleCourseData,
        subjects: ['React', 'JavaScript', 'Hooks', 'Context API'],
      };
      const course = new Courses(courseData);
      expect(course.subjects).toHaveLength(4);
      expect(course.subjects).toContain('React');
      expect(course.subjects).toContain('JavaScript');
    });

    test('should handle high priority courses', async () => {
      const courseData = {
        ...sampleCourseData,
        isTopCourse: true,
        topPriority: 10,
      };
      const course = new Courses(courseData);
      expect(course.isTopCourse).toBe(true);
      expect(course.topPriority).toBe(10);
    });
  });
});
