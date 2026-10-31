import { describe, expect, it } from 'vitest';
import { embedUrl } from '@/lib/media-url';
import { parseDriveId, parseYouTubeId, safeHttpUrl, slugify } from '@/lib/util';

describe('parseYouTubeId', () => {
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ?t=3', 'dQw4w9WgXcQ'],
    ['https://youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
  ])('membaca %s', (url, id) => expect(parseYouTubeId(url)).toBe(id));

  it.each(['https://evil.example/watch?v=dQw4w9WgXcQ', 'javascript:alert(1)', 'bukan url'])('menolak %s', (url) => {
    expect(parseYouTubeId(url)).toBeNull();
  });
});

describe('parseDriveId', () => {
  it('membaca tautan file dan open', () => {
    expect(parseDriveId('https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/view?usp=sharing')).toBe('1AbCdEfGhIjKlMnOp');
    expect(parseDriveId('https://drive.google.com/open?id=1AbCdEfGhIjKlMnOp')).toBe('1AbCdEfGhIjKlMnOp');
  });
  it('menolak host lain', () => {
    expect(parseDriveId('https://drive.google.com.evil.example/file/d/1AbCdEfGhIjKlMnOp/view')).toBeNull();
  });
});

describe('embedUrl', () => {
  it('memakai domain privacy-enhanced YouTube', () => {
    expect(embedUrl({ kind: 'video', source: 'youtube', storageKey: null, externalId: 'abc123' })).toContain('youtube-nocookie.com/embed/abc123');
  });
});

describe('safeHttpUrl', () => {
  it('hanya menerima http dan https', () => {
    expect(safeHttpUrl('https://example.com')).toBe('https://example.com/');
    expect(safeHttpUrl('javascript:alert(1)')).toBeNull();
    expect(safeHttpUrl('data:text/html,x')).toBeNull();
  });
});

describe('slugify', () => {
  it('membuat slug aman', () => {
    expect(slugify('Déjà Vu: Project #1!')).toBe('deja-vu-project-1');
    expect(slugify('!!!')).toBe('item');
  });
});
