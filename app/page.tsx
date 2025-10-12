import Link from 'next/link';

export default function Home() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-24 text-center">
      <h1 className="mb-4 text-5xl font-bold tracking-tight text-gray-900">
        Welcome to the Marketplace
      </h1>
      <p className="mb-8 text-xl text-gray-600">
        Digital products, one-time purchases, and subscriptions
      </p>
      <div className="flex items-center justify-center gap-4">
        <Link
          href="/market"
          className="rounded-lg bg-gray-900 px-6 py-3 text-lg font-medium text-white transition-colors hover:bg-gray-800"
        >
          Browse Products
        </Link>
        <Link
          href="/dashboard/market"
          className="rounded-lg border border-gray-300 px-6 py-3 text-lg font-medium text-gray-900 transition-colors hover:bg-gray-50"
        >
          Admin Dashboard
        </Link>
      </div>
      <div className="mt-16 grid gap-8 text-left sm:grid-cols-3">
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="mb-2 text-lg font-semibold">Free Previews</h3>
          <p className="text-sm text-gray-600">
            Try before you buy with free snippet previews of all products
          </p>
        </div>
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="mb-2 text-lg font-semibold">Secure Payments</h3>
          <p className="text-sm text-gray-600">
            Pay with Stripe or PayPal. Your payment info is always secure
          </p>
        </div>
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="mb-2 text-lg font-semibold">Instant Access</h3>
          <p className="text-sm text-gray-600">
            Download immediately after purchase or access ongoing series content
          </p>
        </div>
      </div>
    </div>
  );
}
