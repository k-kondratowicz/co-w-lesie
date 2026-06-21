import { afterEach, describe, expect, it } from 'vitest';
import { isAllowedImageType, isReportImageKey, reportImageKey, reportImageUrl } from './image';

describe('isAllowedImageType', () => {
  it('accepts jpeg/png/webp and rejects anything else', () => {
    expect(isAllowedImageType('image/webp')).toBe(true);
    expect(isAllowedImageType('image/jpeg')).toBe(true);
    expect(isAllowedImageType('image/png')).toBe(true);
    expect(isAllowedImageType('image/gif')).toBe(false);
    expect(isAllowedImageType('image/svg+xml')).toBe(false);
    expect(isAllowedImageType('application/pdf')).toBe(false);
  });
});

describe('reportImageKey / isReportImageKey', () => {
  it('generates a namespaced .webp key that validates', () => {
    const key = reportImageKey();

    expect(key).toMatch(/^reports\/[a-f0-9-]+\.webp$/);
    expect(isReportImageKey(key)).toBe(true);
  });

  it('rejects keys outside the namespace, with a non-webp extension, or path traversal', () => {
    expect(isReportImageKey('reports/abc.gif')).toBe(false);
    expect(isReportImageKey('reports/abc.jpg')).toBe(false);
    expect(isReportImageKey('other/abc.webp')).toBe(false);
    expect(isReportImageKey('../secret.webp')).toBe(false);
    expect(isReportImageKey('reports/../x.webp')).toBe(false);
  });
});

describe('reportImageUrl', () => {
  const original = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

  afterEach(() => {
    process.env.NEXT_PUBLIC_R2_PUBLIC_URL = original;
  });

  it('is null without a key or without a configured public base', () => {
    process.env.NEXT_PUBLIC_R2_PUBLIC_URL = 'https://pub.example.r2.dev';
    expect(reportImageUrl(null)).toBeNull();

    delete process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
    expect(reportImageUrl('reports/a.webp')).toBeNull();
  });

  it('joins the base and key, stripping a trailing slash', () => {
    process.env.NEXT_PUBLIC_R2_PUBLIC_URL = 'https://pub.example.r2.dev/';

    expect(reportImageUrl('reports/a.webp')).toBe('https://pub.example.r2.dev/reports/a.webp');
  });
});
