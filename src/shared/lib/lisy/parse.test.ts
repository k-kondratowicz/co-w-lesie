import { describe, expect, it } from 'vitest';
import { parseDateRange, parseSchedule } from './parse';

describe('parseDateRange', () => {
  it('parses a same-month range', () => {
    expect(parseDateRange('16-19 kwietnia', 2026)).toEqual({ start: '2026-04-16', end: '2026-04-19' });
  });

  it('parses a cross-month range', () => {
    expect(parseDateRange('29 maja - 2 czerwca', 2026)).toEqual({ start: '2026-05-29', end: '2026-06-02' });
  });

  it('parses a single day as a zero-length range', () => {
    expect(parseDateRange('5 maja', 2026)).toEqual({ start: '2026-05-05', end: '2026-05-05' });
  });

  it('treats the "--" placeholder as null (an empty season), not an error', () => {
    expect(parseDateRange('--', 2026)).toBeNull();
    expect(parseDateRange('', 2026)).toBeNull();
  });

  it('returns undefined for an unknown month or unparseable text', () => {
    expect(parseDateRange('16-19 kwiecien', 2026)).toBeUndefined();
    expect(parseDateRange('latem', 2026)).toBeUndefined();
  });
});

const FIXTURE = `
<h1>Harmonogram szczepień lisów - 2026</h1>
<table class="schedule-table">
  <tr><th>Data</th><th>Województwa</th></tr>
  <tr><td>16-19 kwietnia</td><td>Podlaskie, Lubelskie, Podkarpackie</td></tr>
</table>
<table class="schedule-table">
  <tr><th>Data</th><th>Województwa</th></tr>
  <tr><td>29 maja - 2 czerwca</td><td>Lubelskie</td></tr>
</table>
<table class="schedule-table">
  <tr><th>Data</th><th>Województwa</th></tr>
  <tr><td>--</td><td>--</td></tr>
</table>
`;

describe('parseSchedule', () => {
  it('reads the year from the heading and expands one row per voivodeship', () => {
    const result = parseSchedule(FIXTURE);

    expect(result.year).toBe(2026);
    expect(result.problems).toEqual([]);
    expect(result.rows).toEqual([
      { year: 2026, voivodeship: 'podlaskie', startDate: '2026-04-16', endDate: '2026-04-19' },
      { year: 2026, voivodeship: 'lubelskie', startDate: '2026-04-16', endDate: '2026-04-19' },
      { year: 2026, voivodeship: 'podkarpackie', startDate: '2026-04-16', endDate: '2026-04-19' },
      { year: 2026, voivodeship: 'lubelskie', startDate: '2026-05-29', endDate: '2026-06-02' },
    ]);
  });

  it('reports an unknown voivodeship instead of writing a bad row', () => {
    const html = `
      <h1>Harmonogram szczepień lisów - 2026</h1>
      <table><tr><td>1-2 maja</td><td>Mazowieckie, Atlantyda</td></tr></table>
    `;

    const result = parseSchedule(html);

    expect(result.rows).toEqual([{ year: 2026, voivodeship: 'mazowieckie', startDate: '2026-05-01', endDate: '2026-05-02' }]);
    expect(result.problems).toContain('unknown voivodeship "atlantyda" in "1-2 maja"');
  });

  it('fails loudly with no rows when the year heading is missing (page restyle)', () => {
    const result = parseSchedule('<table><tr><td>1-2 maja</td><td>Mazowieckie</td></tr></table>');

    expect(result.rows).toEqual([]);
    expect(result.problems.length).toBeGreaterThan(0);
  });
});
