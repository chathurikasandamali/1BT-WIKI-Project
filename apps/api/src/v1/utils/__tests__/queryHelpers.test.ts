import { describe, it, expect } from '@jest/globals';
import { buildSearchFilter, buildSortOrder, assertValidSort } from '../queryHelpers.js';
import { AppError } from '@errors/AppError.js';

describe('queryHelpers', () => {
  describe('buildSearchFilter', () => {
    it('should return {} when search is undefined, null, empty or only whitespace', () => {
      expect(buildSearchFilter('title', undefined)).toEqual({});
      expect(buildSearchFilter('title', '')).toEqual({});
      expect(buildSearchFilter('title', '   ')).toEqual({});
    });

    it('should return correct case-insensitive contains filter for a valid search term', () => {
      expect(buildSearchFilter('title', 'react')).toEqual({
        title: { contains: 'react', mode: 'insensitive' },
      });
    });

    it('should trim whitespace from the search term', () => {
      expect(buildSearchFilter('title', '  node js  ')).toEqual({
        title: { contains: 'node js', mode: 'insensitive' },
      });
    });
  });

  describe('buildSortOrder', () => {
    const allowed = ['title', 'createdAt', 'views'] as const;

    it('should fall back to the default field when sort is undefined or not in allow-list', () => {
      // Undefined sort
      expect(buildSortOrder(allowed, undefined, 'asc', 'createdAt')).toEqual({
        createdAt: 'asc',
      });
      // Invalid sort field
      expect(buildSortOrder(allowed, 'invalidField', 'desc', 'createdAt')).toEqual({
        createdAt: 'desc',
      });
    });

    it('should respect a valid sort field and default direction to desc if order is not asc', () => {
      expect(buildSortOrder(allowed, 'title', undefined, 'createdAt')).toEqual({
        title: 'desc',
      });
      expect(buildSortOrder(allowed, 'views', 'desc', 'createdAt')).toEqual({
        views: 'desc',
      });
      expect(buildSortOrder(allowed, 'views', 'invalidOrder', 'createdAt')).toEqual({
        views: 'desc',
      });
    });

    it('should support asc order if specified', () => {
      expect(buildSortOrder(allowed, 'title', 'asc', 'createdAt')).toEqual({
        title: 'asc',
      });
    });

    it('should default to first allowed field if defaultField is not provided', () => {
      expect(buildSortOrder(allowed, undefined, 'asc')).toEqual({
        title: 'asc',
      });
    });
  });

  describe('assertValidSort', () => {
    const allowed = ['title', 'createdAt', 'views'] as const;

    it('should not throw if sort is undefined', () => {
      expect(() => assertValidSort(allowed, undefined)).not.toThrow();
    });

    it('should not throw if sort is in the allow-list', () => {
      expect(() => assertValidSort(allowed, 'title')).not.toThrow();
      expect(() => assertValidSort(allowed, 'createdAt')).not.toThrow();
      expect(() => assertValidSort(allowed, 'views')).not.toThrow();
    });

    it('should throw AppError with 400 status if sort is not in the allow-list', () => {
      let error: any;
      try {
        assertValidSort(allowed, 'invalidField');
      } catch (e) {
        error = e;
      }
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(400);
      expect(error.message).toContain('Invalid sort field');
      expect(error.message).toContain('title, createdAt, views');
    });
  });
});
