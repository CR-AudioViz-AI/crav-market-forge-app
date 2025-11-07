import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/supabase/server';
import { userHasProductAccess } from '@/lib/marketplace/access';
import { notFound } from 'next/navigation';
import fs from 'fs/promises';
import path from 'path';
import { getErrorMessage, logError, formatApiError } from '@/lib/utils/error-utils';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const user = await getUser();
    const supabase = await createServerClient();

    const result = await supabase
      .from('products')
      .select('id, title, file_path')
      .eq('slug' as 'id', slug as any)
      .single() as any;

    if (!result.data || typeof result.data !== 'object' || !('file_path' in result.data)) {
      return notFound();
    }

    const product = result.data as { id: string; title: string; file_path: string | null };

    if (!product.file_path) {
      return notFound();
    }

    const hasAccess = await userHasProductAccess(user?.id ?? null, product.id);

    if (!hasAccess) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // SECURITY: Validate file path to prevent directory traversal
    const normalizedPath = path.normalize(product.file_path);
    if (normalizedPath.includes('..') || path.isAbsolute(normalizedPath)) {
      console.error('Invalid file path detected:', product.file_path);
      return new NextResponse('Invalid file path', { status: 400 });
    }

    const fileAbsPath = path.join(process.cwd(), 'storage', normalizedPath);

    try {
      // SECURITY: Check file stats before reading to enforce size limits
      const stats = await fs.stat(fileAbsPath);
      const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limit

      if (stats.size > MAX_FILE_SIZE) {
        console.error(`File too large: ${stats.size} bytes for ${fileAbsPath}`);
        return new NextResponse('File too large', { status: 413 });
      }

      const fileData = await fs.readFile(fileAbsPath);
      const fileName = path.basename(fileAbsPath);
      const fileExt = path.extname(fileName).toLowerCase();

      // SECURITY: Set appropriate content type based on extension
      const contentTypeMap: Record<string, string> = {
        '.pdf': 'application/pdf',
        '.epub': 'application/epub+zip',
        '.zip': 'application/zip',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.txt': 'text/plain',
        '.md': 'text/markdown',
      };

      const contentType = contentTypeMap[fileExt] || 'application/octet-stream';

      return new NextResponse(fileData, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'private, max-age=3600',
        },
      });
    } catch (fileError) {
      console.error('File read error:', fileError);
      return new NextResponse('File not found', { status: 404 });
    }
  } catch (error: unknown) {
    logError(\'Download error:\', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
