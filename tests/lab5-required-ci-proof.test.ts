import { describe, expect, it } from 'vitest';

describe('Lab 5 C-02: intentionally failing temporary PR check', () => {
  it('must fail solely on this demonstration branch', () => {
    // Deliberately false. NEVER merge this file into main or staging.
    expect('required-ci-gate').toBe('intentionally-not-equal');
  });
});
