import { describe, expect, it } from 'vitest';
import { descriptionToKind, tourismObjectName } from './mappers';

describe('descriptionToKind', () => {
  it('maps the BDL descriptions we import', () => {
    expect(descriptionToKind('Parkingi leśne')).toBe('PARKING');
    expect(descriptionToKind('Miejsca postoju pojazdów')).toBe('VEHICLE_STOP');
    expect(descriptionToKind('Miejsca biwakowania')).toBe('CAMP_SITE');
    expect(descriptionToKind('Pola biwakowe')).toBe('CAMP_FIELD');
  });

  it('tolerates surrounding whitespace', () => {
    expect(descriptionToKind('  Parkingi leśne ')).toBe('PARKING');
  });

  it('returns null for descriptions we do not import, so they are skipped rather than mislabelled', () => {
    expect(descriptionToKind('Miejsca/place zabaw dla dzieci')).toBeNull();
    expect(descriptionToKind('Parking leśny')).toBeNull(); // a reworded label must not be guessed at
    expect(descriptionToKind(null)).toBeNull();
    expect(descriptionToKind('')).toBeNull();
  });
});

describe('tourismObjectName', () => {
  it('keeps a real object name', () => {
    expect(tourismObjectName(' MPP Parzyn ')).toBe('MPP Parzyn');
  });

  it('drops blanks and the layer-wide placeholder', () => {
    expect(tourismObjectName(null)).toBeNull();
    expect(tourismObjectName('   ')).toBeNull();
    expect(tourismObjectName('Zanocuj w lesie')).toBeNull();
  });
});
