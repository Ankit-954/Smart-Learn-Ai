import { describe, test, expect } from '@jest/globals';
import mongoose from 'mongoose';
import Review from '../models/Review.js';

describe('Review Model', () => {
  const sampleReviewData = {
    name: 'John Doe',
    comment: 'This course was amazing! I learned so much.',
    rating: 5,
    image: 'https://example.com/review-image.jpg',
    isFeatured: false,
  };

  describe('Schema Validation', () => {
    test('should create a review with valid data', async () => {
      const review = new Review(sampleReviewData);
      expect(review).toBeDefined();
      expect(review.name).toBe('John Doe');
      expect(review.comment).toBe('This course was amazing! I learned so much.');
      expect(review.rating).toBe(5);
    });

    test('should fail without required name field', async () => {
      const reviewData = { ...sampleReviewData, name: undefined };
      const review = new Review(reviewData);
      let error;
      try {
        await review.validate();
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error.errors.name).toBeDefined();
    });

    test('should fail without required comment field', async () => {
      const reviewData = { ...sampleReviewData, comment: undefined };
      const review = new Review(reviewData);
      let error;
      try {
        await review.validate();
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error.errors.comment).toBeDefined();
    });

    test('should accept review without rating (rating is optional)', async () => {
      const reviewData = {
        name: 'Jane Smith',
        comment: 'Great experience!',
        rating: undefined,
      };
      const review = new Review(reviewData);
      expect(review.rating).toBeUndefined();
    });

    test('should have default empty string for image', async () => {
      const reviewData = {
        ...sampleReviewData,
        image: undefined,
      };
      const review = new Review(reviewData);
      expect(review.image).toBe('');
    });

    test('should have default isFeatured as false', async () => {
      const reviewData = {
        ...sampleReviewData,
        isFeatured: undefined,
      };
      const review = new Review(reviewData);
      expect(review.isFeatured).toBe(false);
    });

    test('should set createdAt automatically', async () => {
      const review = new Review(sampleReviewData);
      expect(review.createdAt).toBeDefined();
      expect(review.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('Rating Validation', () => {
    test('should accept minimum rating of 1', async () => {
      const reviewData = { ...sampleReviewData, rating: 1 };
      const review = new Review(reviewData);
      let error;
      try {
        await review.validate();
      } catch (err) {
        error = err;
      }
      expect(error).toBeUndefined();
      expect(review.rating).toBe(1);
    });

    test('should accept maximum rating of 5', async () => {
      const reviewData = { ...sampleReviewData, rating: 5 };
      const review = new Review(reviewData);
      let error;
      try {
        await review.validate();
      } catch (err) {
        error = err;
      }
      expect(error).toBeUndefined();
      expect(review.rating).toBe(5);
    });

    test('should accept middle ratings (2, 3, 4)', async () => {
      for (const rating of [2, 3, 4]) {
        const reviewData = { ...sampleReviewData, rating };
        const review = new Review(reviewData);
        let error;
        try {
          await review.validate();
        } catch (err) {
          error = err;
        }
        expect(error).toBeUndefined();
        expect(review.rating).toBe(rating);
      }
    });

    test('should fail with rating below 1', async () => {
      const reviewData = { ...sampleReviewData, rating: 0 };
      const review = new Review(reviewData);
      let error;
      try {
        await review.validate();
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error.errors.rating).toBeDefined();
    });

    test('should fail with rating above 5', async () => {
      const reviewData = { ...sampleReviewData, rating: 6 };
      const review = new Review(reviewData);
      let error;
      try {
        await review.validate();
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error.errors.rating).toBeDefined();
    });

    test('should fail with negative rating', async () => {
      const reviewData = { ...sampleReviewData, rating: -1 };
      const review = new Review(reviewData);
      let error;
      try {
        await review.validate();
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error.errors.rating).toBeDefined();
    });
  });

  describe('Featured Reviews', () => {
    test('should create featured review', async () => {
      const reviewData = {
        ...sampleReviewData,
        isFeatured: true,
      };
      const review = new Review(reviewData);
      expect(review.isFeatured).toBe(true);
    });

    test('should toggle isFeatured flag', async () => {
      const review = new Review(sampleReviewData);
      expect(review.isFeatured).toBe(false);
      review.isFeatured = !review.isFeatured;
      expect(review.isFeatured).toBe(true);
      review.isFeatured = !review.isFeatured;
      expect(review.isFeatured).toBe(false);
    });
  });

  describe('Comment Validation', () => {
    test('should accept long comments', async () => {
      const longComment = 'A'.repeat(1000);
      const reviewData = { ...sampleReviewData, comment: longComment };
      const review = new Review(reviewData);
      expect(review.comment).toHaveLength(1000);
    });

    test('should accept comments with special characters', async () => {
      const specialComment = 'Great! 👍 Course exceeded expectations. 10/10 would recommend!';
      const reviewData = { ...sampleReviewData, comment: specialComment };
      const review = new Review(reviewData);
      expect(review.comment).toBe(specialComment);
    });

    test('should accept comments with HTML-like content', async () => {
      const htmlComment = 'The <strong>content</strong> was &amp; remains excellent!';
      const reviewData = { ...sampleReviewData, comment: htmlComment };
      const review = new Review(reviewData);
      expect(review.comment).toBe(htmlComment);
    });
  });

  describe('Name Validation', () => {
    test('should accept names with spaces', async () => {
      const reviewData = { ...sampleReviewData, name: 'Mary Jane Watson' };
      const review = new Review(reviewData);
      expect(review.name).toBe('Mary Jane Watson');
    });

    test('should accept names with special characters', async () => {
      const reviewData = { ...sampleReviewData, name: "O'Connor" };
      const review = new Review(reviewData);
      expect(review.name).toBe("O'Connor");
    });

    test('should accept non-English names', async () => {
      const reviewData = { ...sampleReviewData, name: '田中太郎' };
      const review = new Review(reviewData);
      expect(review.name).toBe('田中太郎');
    });
  });
});
