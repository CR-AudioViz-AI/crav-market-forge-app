import Link from 'next/link';
import { CheckCircle } from 'lucide-react';

export default function ThanksPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <div className="mb-6 flex justify-center">
        <CheckCircle className="h-16 w-16 text-green-500" />
      </div>
      <h1 className="mb-3 text-3xl font-bold text-gray-900">Thank You!</h1>
      <p className="mb-8 text-gray-600">
        Your payment is being processed. You'll have access to your purchase shortly.
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
