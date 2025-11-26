// Types
export * from './types';

// Individual editions
import { edition_2025_11_26 } from './2025.11.26';
import { edition_2025_11_20 } from './2025.11.20';

// Combined editions array (newest first)
export const editions = [
  edition_2025_11_26,
  edition_2025_11_20,
];
