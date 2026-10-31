import { createReadStream, promises as fs } from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { mediaDir } from '@/lib/media';

const TYPES: Record<string, string> = { '.webp': 'image/webp', '.mp4': 'video/mp4', '.webm': 'video/webm' };

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const parts = (await params).path;
  const root = mediaDir();
  const file = path.resolve(root, ...parts);
  const type = TYPES[path.extname(file)];
  if (!type || !file.startsWith(root + path.sep)) return new Response('Not found', { status: 404 });

  let size: number;
  try {
    const stat = await fs.stat(file);
    if (!stat.isFile()) throw new Error();
    size = stat.size;
  } catch {
    return new Response('Not found', { status: 404 });
  }

  const headers = new Headers({
    'Content-Type': type,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=31536000, immutable',
  });

  const range = request.headers.get('range')?.match(/^bytes=(\d*)-(\d*)$/);
  if (range && (range[1] || range[2])) {
    const start = range[1] ? Number(range[1]) : Math.max(size - Number(range[2]), 0);
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start > end || start >= size) {
      return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
    }
    headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
    headers.set('Content-Length', String(end - start + 1));
    return new Response(Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream, { status: 206, headers });
  }

  headers.set('Content-Length', String(size));
  return new Response(Readable.toWeb(createReadStream(file)) as ReadableStream, { headers });
}
