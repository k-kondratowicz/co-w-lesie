import { describe, expect, it } from 'vitest';
import { plPlural } from './pl-plural';

const forms = { one: 'osoba', few: 'osoby', many: 'osób' };

describe('plPlural', () => {
  it('applies Polish plural categories, including the irregular ones', () => {
    expect(plPlural(1, forms)).toBe('osoba');
    expect(plPlural(2, forms)).toBe('osoby');
    expect(plPlural(4, forms)).toBe('osoby');
    expect(plPlural(5, forms)).toBe('osób');
    expect(plPlural(0, forms)).toBe('osób');
    expect(plPlural(12, forms)).toBe('osób'); // 12 is "many", not "few"
    expect(plPlural(22, forms)).toBe('osoby'); // 22 is "few", not "many"
  });
});
