import { describe, it, expect } from 'vitest';
import { toPx } from './utils';

describe('toPx Utility', () => {
    it('should parse pixel values', () => {
        expect(toPx('100px')).toBe(100);
    });

    it('should return number as is', () => {
        expect(toPx(150)).toBe(150);
    });

    it('should return Infinity for none/invalid', () => {
        expect(toPx('none')).toBe(Infinity);
    });

    // Mocking window for VW/VH tests would be next steps, 
    // but this confirms the test runner works.
});
