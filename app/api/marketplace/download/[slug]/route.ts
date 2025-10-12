import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/supabase/server';
import { userHasProductAccess } from '@/lib/marketplace/access';
import { notFound } from 'next/navigation';
import fs from 'fs/promises';
import path from 'path';

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

    const fileAbsPath = path.join(process.cwd(), 'storage', product.file_path);

    try {
      const fileData = await fs.readFile(fileAbsPath);
      const fileName = path.basename(fileAbsPath);

      return new NextResponse(fileData, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        },
      });
    } catch (fileError) {
      console.error('File read error:', fileError);
      return new NextResponse('File not found', { status: 404 });
    }
  } catch (error) {
    console.error('Download error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
