import type { jest as JestGlobal } from '@jest/globals';

declare global {
  const jest: typeof JestGlobal;
}

export {};
