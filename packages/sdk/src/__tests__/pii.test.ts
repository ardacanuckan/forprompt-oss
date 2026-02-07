/**
 * Tests for PII Detection and Redaction
 */

import { describe, it, expect } from 'vitest';
import {
  redactPII,
  containsPII,
  getAvailablePIIPatterns,
  createPIIPattern,
  getDefaultPIIConfig,
} from '../pii';

describe('PII Redaction', () => {
  describe('redactPII()', () => {
    it('should redact email addresses', () => {
      const content = 'Contact me at john@example.com for details';
      const result = redactPII(content);

      expect(result.redacted).toBe('Contact me at [EMAIL_REDACTED] for details');
      expect(result.hasPII).toBe(true);
      expect(result.counts.email).toBe(1);
    });

    it('should redact phone numbers', () => {
      const content = 'Call me at (555) 123-4567 or 555-123-4567';
      const result = redactPII(content);

      expect(result.redacted).toContain('[PHONE_REDACTED]');
      expect(result.hasPII).toBe(true);
      expect(result.counts.phone).toBeGreaterThan(0);
    });

    it('should redact social security numbers', () => {
      const content = 'SSN: 123-45-6789';
      const result = redactPII(content);

      expect(result.redacted).toContain('[SSN_REDACTED]');
      expect(result.hasPII).toBe(true);
      expect(result.counts.ssn).toBe(1);
    });

    it('should redact credit card numbers', () => {
      const content = 'Card: 4111-1111-1111-1111';
      const result = redactPII(content);

      expect(result.redacted).toContain('[CC_REDACTED]');
      expect(result.hasPII).toBe(true);
    });

    it('should redact IP addresses', () => {
      const content = 'Server IP: 192.168.1.1';
      const result = redactPII(content);

      expect(result.redacted).toContain('[IP_REDACTED]');
      expect(result.hasPII).toBe(true);
      expect(result.counts.ip_v4).toBe(1);
    });

    it('should redact multiple PII types', () => {
      const content = 'Email: john@example.com, Phone: (555) 123-4567';
      const result = redactPII(content);

      expect(result.redacted).toContain('[EMAIL_REDACTED]');
      expect(result.redacted).toContain('[PHONE_REDACTED]');
      expect(result.hasPII).toBe(true);
      expect(result.redactions.length).toBeGreaterThanOrEqual(2);
    });

    it('should return unchanged content when disabled', () => {
      const content = 'Contact me at john@example.com';
      const result = redactPII(content, { enabled: false });

      expect(result.redacted).toBe(content);
      expect(result.hasPII).toBe(false);
      expect(result.redactions.length).toBe(0);
    });

    it('should handle content with no PII', () => {
      const content = 'This is a clean message';
      const result = redactPII(content);

      expect(result.redacted).toBe(content);
      expect(result.hasPII).toBe(false);
      expect(result.redactions.length).toBe(0);
    });

    it('should use specific patterns only', () => {
      const content = 'Email: john@example.com, Phone: (555) 123-4567';
      const result = redactPII(content, {
        enabled: true,
        patterns: ['email'], // Only redact emails
      });

      expect(result.redacted).toContain('[EMAIL_REDACTED]');
      expect(result.redacted).toContain('(555) 123-4567'); // Phone not redacted
      expect(result.counts.email).toBe(1);
      expect(result.counts.phone).toBeUndefined();
    });

    it('should support custom patterns', () => {
      const customPattern = {
        name: 'employee_id',
        pattern: /\bEMP-[0-9]{6}\b/g,
        replacement: '[EMPLOYEE_ID_REDACTED]',
      };

      const content = 'Employee EMP-123456 reported an issue';
      const result = redactPII(content, {
        enabled: true,
        customPatterns: [customPattern],
      });

      expect(result.redacted).toContain('[EMPLOYEE_ID_REDACTED]');
      expect(result.counts.employee_id).toBe(1);
    });
  });

  describe('containsPII()', () => {
    it('should detect email addresses', () => {
      const content = 'Contact: john@example.com';
      expect(containsPII(content)).toBe(true);
    });

    it('should detect phone numbers', () => {
      const content = 'Call: (555) 123-4567';
      expect(containsPII(content)).toBe(true);
    });

    it('should return false for clean content', () => {
      const content = 'This is a clean message';
      expect(containsPII(content)).toBe(false);
    });

    it('should check specific patterns only', () => {
      const content = 'Email: john@example.com, Phone: (555) 123-4567';
      expect(containsPII(content, ['email'])).toBe(true);
      expect(containsPII(content, ['ssn'])).toBe(false);
    });
  });

  describe('getAvailablePIIPatterns()', () => {
    it('should return list of pattern names', () => {
      const patterns = getAvailablePIIPatterns();

      expect(patterns).toBeInstanceOf(Array);
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns).toContain('email');
      expect(patterns).toContain('phone');
      expect(patterns).toContain('ssn');
    });
  });

  describe('createPIIPattern()', () => {
    it('should create a custom pattern', () => {
      const pattern = createPIIPattern(
        'test_pattern',
        /TEST-[0-9]{4}/g,
        '[TEST_REDACTED]'
      );

      expect(pattern.name).toBe('test_pattern');
      expect(pattern.pattern).toBeInstanceOf(RegExp);
      expect(pattern.replacement).toBe('[TEST_REDACTED]');
    });

    it('should throw error if pattern lacks global flag', () => {
      expect(() => {
        createPIIPattern('test', /TEST/, '[REDACTED]');
      }).toThrow('must have global flag');
    });
  });

  describe('getDefaultPIIConfig()', () => {
    it('should return default configuration', () => {
      const config = getDefaultPIIConfig();

      expect(config.enabled).toBe(true);
      expect(config.logStats).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      const result = redactPII('');

      expect(result.redacted).toBe('');
      expect(result.hasPII).toBe(false);
    });

    it('should handle multiple instances of same PII type', () => {
      const content = 'Email: john@example.com and jane@example.com';
      const result = redactPII(content);

      expect(result.counts.email).toBe(2);
      expect(result.redacted).toBe(
        'Email: [EMAIL_REDACTED] and [EMAIL_REDACTED]'
      );
    });

    it('should handle malformed patterns gracefully', () => {
      const content = 'Test 123-45-67 incomplete SSN';
      const result = redactPII(content);

      // Should not crash, may or may not match depending on pattern
      expect(result).toBeDefined();
      expect(result.redacted).toBeDefined();
    });
  });
});
