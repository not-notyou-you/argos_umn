/** Pendaftaran resmi anggota Argos Club dilakukan lewat The IO Foundation. */
export const JOIN_URL = 'https://join.theiofoundation.org';

export function slugify(text: string) {
  return (
    text
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'item'
  );
}

/** Mengembalikan URL yang sudah dinormalkan, atau null jika bukan http/https. */
export function safeHttpUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Hanya menerima path di situs ini; `//host` dan `/\\host` dibaca browser sebagai situs lain. */
export function safeLocalPath(value: string): string {
  if (!/^\/(?![/\\])/.test(value) || /[\\\u0000-\u001f]/.test(value)) return '/';
  return value;
}

export function excerpt(text: string, length = 140) {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > length ? `${flat.slice(0, length).trimEnd()}…` : flat;
}

export function formatMonth(date: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
}

export function formatDate(date: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`),
  );
}

export function parseYouTubeId(input: string): string | null {
  const url = parseUrl(input);
  if (!url) return null;
  const host = url.hostname.replace(/^(www|m)\./, '');
  let id: string | null = null;
  if (host === 'youtu.be') id = url.pathname.slice(1).split('/')[0];
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (url.pathname === '/watch') id = url.searchParams.get('v');
    else id = url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1] ?? null;
  }
  return id && /^[\w-]{6,20}$/.test(id) ? id : null;
}

export function parseDriveId(input: string): string | null {
  const url = parseUrl(input);
  if (!url || (url.hostname !== 'drive.google.com' && url.hostname !== 'docs.google.com')) return null;
  const id = url.pathname.match(/\/d\/([\w-]{10,})/)?.[1] ?? url.searchParams.get('id');
  return id && /^[\w-]{10,}$/.test(id) ? id : null;
}

function parseUrl(input: string) {
  try {
    const url = new URL(input.trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null;
  } catch {
    return null;
  }
}
