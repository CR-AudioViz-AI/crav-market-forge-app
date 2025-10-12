import Link from 'next/link';
import { XCircle } from 'lucide-react';

export default function CancelPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <div className="mb-6 flex justify-center">
        <XCircle className="h-16 w-16 text-red-500" />
      </div>
      <h1 className="mb-3 text-3xl font-bold text-gray-900">Payment Canceled</h1>
      <p className="mb-8 text-gray-600">
        Your payment was canceled. No charges were made.
      </p>
      <Link
        href="/market"
        className="inline-block rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800"
      >
        Back to Marketplace
      </Link>
    </div>
  );
}
