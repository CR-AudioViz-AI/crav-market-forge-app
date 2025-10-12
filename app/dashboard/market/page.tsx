import { createServerClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Plus, ExternalLink, Edit } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function MarketAdminPage() {
  const supabase = await createServerClient();

  const result = await supabase
    .from('products')
    .select('*, series(*)')
    .order('created_at', { ascending: false });

  const products = (result.data || []) as any[];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Market Admin</h1>
          <p className="mt-1 text-sm text-gray-600">Manage marketplace products and series</p>
        </div>
        <Link
          href="/dashboard/market/new"
          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
        >
          <Plus className="h-4 w-4" />
          New Product
        </Link>
      </div>

      {!products || products.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <p className="mb-4 text-gray-600">No products yet</p>
          <Link
            href="/dashboard/market/new"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-900 hover:text-gray-700"
          >
            <Plus className="h-4 w-4" />
            Create your first product
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((product) => {
            const seriesData = Array.isArray(product.series) ? product.series[0] : product.series;
            return (
              <div
                key={product.id}
                className="flex items-center justify-between rounded-lg border bg-white p-4 shadow-sm"
              >
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-gray-900">{product.title}</h2>
                    {!product.is_published && (
                      <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                        Draft
                      </span>
                    )}
                    {product.is_series && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        Series
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="font-medium">{product.slug}</span>
                    <span>•</span>
                    <span className="uppercase">{product.type}</span>
                    <span>•</span>
                    <span>
                      {product.is_series
                        ? `$${((seriesData?.price_cents ?? 0) / 100).toFixed(2)}/mo`
                        : `$${(product.price_cents / 100).toFixed(2)}`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/dashboard/market/edit/${product.id}`}
                    className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    Edit
                  </Link>
                  <Link
                    href={`/market/${product.slug}`}
                    className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    View
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
