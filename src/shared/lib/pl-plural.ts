const rules = new Intl.PluralRules('pl');

// Picks the Polish plural form for a count (e.g. 1 → "zgłoszenie", 3 → "zgłoszenia", 5 → "zgłoszeń").
// Uses Intl so the irregular cases (22 = few, 12 = many) are handled correctly.
export function plPlural(count: number, forms: { one: string; few: string; many: string }): string {
  const category = rules.select(count);

  if (category === 'one') {
    return forms.one;
  }

  if (category === 'few') {
    return forms.few;
  }

  return forms.many;
}
