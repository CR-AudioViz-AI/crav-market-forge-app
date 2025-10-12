import Link from 'next/link';
import { Database } from '@/lib/supabase/types';

type Product = Database['public']['Tables']['products']['Row'] & {
  series?: Database['public']['Tables']['series']['Row'] | null;
};

export function ProductCard({ product }: { product: Product }) {
  const price = product.is_series
    ? `From $${((product.series?.price_cents ?? 0) / 100).toFixed(2)}/mo`
    : `$${(product.price_cents / 100).toFixed(2)}`;

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
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

      <h2 className="mb-2 text-xl font-semibold text-gray-900">{product.title}</h2>

      <p className="mb-4 line-clamp-3 text-sm text-gray-600">{product.description}</p>

      <div className="flex items-center justify-between">
        <span className="text-lg font-semibold text-gray-900">{price}</span>
        <Link
          href={`/market/${product.slug}`}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
        >
          View Details
        </Link>
      </div>
    </div>
  );
}
