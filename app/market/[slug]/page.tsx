import { createServerClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/supabase/server';
import { userHasProductAccess } from '@/lib/marketplace/access';
import { PurchaseButton } from '@/components/marketplace/PurchaseButton';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Download } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createServerClient();
  const user = await getUser();

  const result = await supabase
    .from('products')
    .select('*, series(*, series_items(*))')
    .eq('slug' as 'id', slug as any)
    .eq('is_published' as 'id', true as any)
    .single();

  const product = result.data as any;

  if (!product) {
    return notFound();
  }

  const hasAccess = await userHasProductAccess(user?.id ?? null, product.id);

  const seriesData = Array.isArray(product.series) ? product.series[0] : product.series;
  const seriesItems = seriesData?.series_items || [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {product.type}
              </span>
              {product.is_series && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                  Series
                </span>
              )}
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900">
              {product.title}
            </h1>
          </div>

          <div className="rounded-lg border bg-white p-6 shadow-sm">
            {!hasAccess ? (
              <div>
                <h2 className="mb-3 text-lg font-semibold text-gray-900">
                  Free Preview
                </h2>
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap text-gray-700">{product.snippet}</p>
                </div>
                <div className="mt-6 rounded-lg border-t bg-gray-50 p-4">
                  <p className="text-sm font-medium text-gray-900">
                    Unlock full access to continue reading
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <h2 className="mb-3 text-lg font-semibold text-gray-900">
                  Full Content
                </h2>
                {!product.is_series ? (
                  product.file_path ? (
                    <Link
                      href={`/api/marketplace/download/${product.slug}`}
                      className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
                    >
                      <Download className="h-4 w-4" />
                      Download File
                    </Link>
                  ) : (
                    <p className="text-sm text-gray-600">
                      No file attached to this product.
                    </p>
                  )
                ) : (
                  <div className="space-y-4">
                    {seriesItems
                      .filter((item: any) => item.is_published)
                      .sort((a: any, b: any) => a.order_index - b.order_index)
                      .map((item: any) => (
                        <div
                          key={item.id}
                          className="rounded-lg border bg-white p-4"
                        >
                          <h3 className="mb-2 font-semibold text-gray-900">
                            {item.title}
                          </h3>
                          <div
                            className="prose prose-sm max-w-none text-gray-700"
                            dangerouslySetInnerHTML={{ __html: item.content }}
                          />
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-6">
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <h3 className="mb-2 text-sm font-medium text-gray-500">Description</h3>
              <p className="text-sm text-gray-700">{product.description}</p>
            </div>

            {!hasAccess && (
              <div className="rounded-lg border bg-white p-6 shadow-sm">
                <div className="mb-4">
                  <h3 className="mb-1 text-lg font-semibold text-gray-900">
                    {product.is_series ? 'Subscribe' : 'Purchase'}
                  </h3>
                  <p className="text-2xl font-bold text-gray-900">
                    {product.is_series
                      ? `$${((seriesData?.price_cents ?? 0) / 100).toFixed(2)}/month`
                      : `$${(product.price_cents / 100).toFixed(2)}`}
                  </p>
                </div>

                {!user ? (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      Sign in to purchase this product
                    </p>
                    <Link
                      href="/auth/signin"
                      className="block w-full rounded-lg bg-gray-900 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-gray-800"
                    >
                      Sign In
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <PurchaseButton
                      productId={product.id}
                      provider="stripe"
                      type={product.is_series ? 'subscription' : 'oneoff'}
                    />
                    <PurchaseButton
                      productId={product.id}
                      provider="paypal"
                      type={product.is_series ? 'subscription' : 'oneoff'}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="rounded-lg border bg-blue-50 p-6">
              <h3 className="mb-2 text-sm font-semibold text-gray-900">
                {product.is_series ? 'Subscription Benefits' : 'What You Get'}
              </h3>
              <p className="text-sm text-gray-700">
                {product.is_series
                  ? 'Unlimited access to all current and future content in this series.'
                  : 'One-time payment for lifetime access. Download immediately after purchase.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
