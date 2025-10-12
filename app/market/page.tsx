import { createServerClient } from '@/lib/supabase/server';
import { ProductCard } from '@/components/marketplace/ProductCard';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function MarketplacePage() {
  const supabase = await createServerClient();

  const result = await supabase
    .from('products')
    .select('*, series(*)')
    .eq('is_published' as 'id', true as any)
    .order('created_at', { ascending: false });

  const products = (result.data || []) as any[];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="mb-2 text-4xl font-bold tracking-tight text-gray-900">
          Marketplace
        </h1>
        <p className="text-lg text-gray-600">
          Free snippets available. Unlock full access with one-time purchases or subscriptions.
        </p>
      </div>

      {!products || products.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <p className="text-gray-600">No products available yet.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      <div className="mt-12 rounded-lg border bg-blue-50 p-6">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">
          Need help choosing?
        </h2>
        <p className="mb-4 text-sm text-gray-600">
          Each product includes a free preview. View any product to see what's included before purchasing.
        </p>
        <Link
          href="/market/about"
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Learn more about our products →
        </Link>
      </div>
    </div>
  );
}
