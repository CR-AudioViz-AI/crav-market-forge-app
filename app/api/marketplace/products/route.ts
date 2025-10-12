import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient();

    const formData = await req.formData();
    const title = formData.get('title') as string;
    const slug = formData.get('slug') as string;
    const type = formData.get('type') as 'ebook' | 'newsletter' | 'template';
    const description = formData.get('description') as string;
    const snippet = formData.get('snippet') as string;
    const priceCents = parseInt(formData.get('price_cents') as string, 10);
    const isSeries = formData.get('is_series') === 'true';
    const isPublished = formData.get('is_published') === 'true';

    const { data: product, error } = (await supabase
      .from('products')
      .insert({
        title,
        slug,
        type,
        description,
        snippet,
        price_cents: priceCents,
        is_series: isSeries,
        is_published: isPublished,
      } as any)
      .select()
      .single()) as any;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (isSeries) {
      await supabase.from('series').insert({
        product_id: product.id,
        interval: 'month' as 'month',
        price_cents: 900,
      } as any);
    }

    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
