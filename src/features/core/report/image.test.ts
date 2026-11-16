import { afterEach, describe, expect, it } from 'vitest';
import {
  isAllowedImageFormat,
  isAllowedImageType,
  isPendingImageKey,
  isReportImageKey,
  pendingImageKey,
  promotedImageKey,
  reportImageUrl,
} from './image';

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

describe('isAllowedImageFormat', () => {
  it('accepts the sharp names of jpeg/png/webp and rejects the rest', () => {
    expect(isAllowedImageFormat('jpeg')).toBe(true);
    expect(isAllowedImageFormat('png')).toBe(true);
    expect(isAllowedImageFormat('webp')).toBe(true);
    expect(isAllowedImageFormat('svg')).toBe(false);
    expect(isAllowedImageFormat('tiff')).toBe(false);
    expect(isAllowedImageFormat('gif')).toBe(false);
  });

  it('does not accept a sharp format name as a Content-Type, or the reverse', () => {
    expect(isAllowedImageType('png')).toBe(false);
    expect(isAllowedImageFormat('image/png')).toBe(false);
  });
});

describe('pendingImageKey / isPendingImageKey', () => {
  it('generates a staged .webp key that validates', () => {
    const key = pendingImageKey();

    expect(key).toMatch(/^pending\/[a-f0-9-]+\.webp$/);
    expect(isPendingImageKey(key)).toBe(true);
  });

  it('rejects stored keys, a non-webp extension, or path traversal', () => {
    expect(isPendingImageKey('reports/abc.webp')).toBe(false);
    expect(isPendingImageKey('pending/abc.jpg')).toBe(false);
    expect(isPendingImageKey('../pending/abc.webp')).toBe(false);
    expect(isPendingImageKey('pending/../x.webp')).toBe(false);
  });
});

describe('promotedImageKey', () => {
  it('moves a staged key into reports/ and keeps its id', () => {
    expect(promotedImageKey('pending/0f2c-91ab.webp')).toBe('reports/0f2c-91ab.webp');
  });

  it('produces a stored key that validates', () => {
    expect(isReportImageKey(promotedImageKey(pendingImageKey()))).toBe(true);
  });
});

describe('isReportImageKey', () => {
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
