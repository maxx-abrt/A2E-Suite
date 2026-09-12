import { describe, it, expect } from 'vitest';
import {
  midKey,
  sortKeyAfter,
  base36Key,
  effectiveSortKey,
  compareSortKeys,
  SortKeySpaceError,
} from '@/lib/sort-key';

describe('sort-key', () => {
  describe('base36Key', () => {
    it('should generate valid base36 keys for positive integers', () => {
      expect(base36Key(0)).toBe('10');
      expect(base36Key(1)).toBe('11');
      expect(base36Key(10)).toBe('1a'); // Correct: '1' (length of 'a') + 'a' (10 in base36)
      expect(base36Key(100)).toBe('22s'); // Correct: '2' (length of '2s') + '2s' (100 in base36)
    });

    it('should handle negative and non-finite values', () => {
      expect(base36Key(-5)).toBe('10');
      expect(base36Key(NaN)).toBe('10');
      expect(base36Key(Infinity)).toBe('10');
    });
  });

  describe('midKey', () => {
    it('should generate key after prev when next is null', () => {
      expect(midKey('a', null)).toBe('ai');
      expect(midKey('z', null)).toBe('zi');
      expect(midKey(null, null)).toBe('i');
    });

    it('should generate key between two keys', () => {
      const key = midKey('a', 'c');
      expect(key).toBe('b');
      expect(key > 'a').toBe(true);
      expect(key < 'c').toBe(true);
    });

    it('should handle adjacent keys', () => {
      const key = midKey('a', 'b');
      expect(key).toBe('ai');
      expect(key > 'a').toBe(true);
      expect(key < 'b').toBe(true);
    });

    it('should throw when prev >= next', () => {
      expect(() => midKey('b', 'a')).toThrow(SortKeySpaceError);
      expect(() => midKey('a', 'a')).toThrow(SortKeySpaceError);
    });

    it('should handle exhausted key space', () => {
      // 'a' and 'a0' have no midpoint
      expect(() => midKey('a', 'a0')).toThrow(SortKeySpaceError);
    });

    it('should generate stable keys for repeated operations', () => {
      let prev: string | null = null;
      const keys: string[] = [];
      
      for (let i = 0; i < 10; i++) {
        const key = midKey(prev, null);
        keys.push(key);
        prev = key;
      }

      // All keys should be in ascending order
      for (let i = 1; i < keys.length; i++) {
        expect(keys[i] > keys[i - 1]).toBe(true);
      }
    });
  });

  describe('sortKeyAfter', () => {
    it('should generate key after given key', () => {
      expect(sortKeyAfter('a')).toBe('ai');
      expect(sortKeyAfter(null)).toBe('i');
      expect(sortKeyAfter(undefined)).toBe('i');
    });
  });

  describe('effectiveSortKey', () => {
    it('should use sortKey if present', () => {
      expect(effectiveSortKey({ sortKey: 'abc' })).toBe('abc');
    });

    it('should fallback to order', () => {
      expect(effectiveSortKey({ order: 100 })).toBe(base36Key(100));
    });

    it('should fallback to createdAt', () => {
      expect(effectiveSortKey({ createdAt: 1000 })).toBe(base36Key(1000));
    });

    it('should handle missing values', () => {
      expect(effectiveSortKey({})).toBe(base36Key(0));
    });
  });

  describe('compareSortKeys', () => {
    it('should compare by sortKey first', () => {
      const a = { sortKey: 'a' };
      const b = { sortKey: 'b' };
      expect(compareSortKeys(a, b)).toBe(-1);
      expect(compareSortKeys(b, a)).toBe(1);
      expect(compareSortKeys(a, a)).toBe(0);
    });

    it('should fallback to order/createdAt for tie-breaking', () => {
      const a = { sortKey: 'a', order: 1, _id: 'id1' };
      const b = { sortKey: 'a', order: 2, _id: 'id2' };
      expect(compareSortKeys(a, b)).toBe(-1);
    });

    it('should use _id for final tie-breaking', () => {
      const a = { sortKey: 'a', order: 1, _id: 'aaa' };
      const b = { sortKey: 'a', order: 1, _id: 'bbb' };
      expect(compareSortKeys(a, b)).toBe(-1);
    });
  });

  describe('key rebalancing scenario', () => {
    it('should detect exhausted keys between a and a0', () => {
      expect(() => midKey('a', 'a0')).toThrow(SortKeySpaceError);
    });

    it('should handle long key chains', () => {
      let prev = 'a';
      const keys: string[] = [prev];
      
      // Generate 100 keys after 'a'
      for (let i = 0; i < 100; i++) {
        const key = midKey(prev, null);
        keys.push(key);
        prev = key;
      }

      // All keys should be in order
      for (let i = 1; i < keys.length; i++) {
        expect(keys[i] > keys[i - 1]).toBe(true);
      }

      // Keys can grow unbounded when always appending 'i' - this is by design
      // The planTreeMove function handles rebalancing when keys exceed 48 chars
      const maxLength = Math.max(...keys.map(k => k.length));
      expect(maxLength).toBeGreaterThan(48); // Unbounded growth is expected
    });
  });
});
