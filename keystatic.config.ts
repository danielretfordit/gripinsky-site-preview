import { config } from '@keystatic/core';

// Схема коллекций появится на этапе 2 (данные и CMS).
export default config({
  storage: { kind: 'local' },
  ui: { brand: { name: 'GRIPINSKY' } },
  collections: {},
});
