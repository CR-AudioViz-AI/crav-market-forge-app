'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface PurchaseButtonProps {
  productId: string;
  provider: 'stripe' | 'paypal';
  type: 'oneoff' | 'subscription';
}

export function PurchaseButton({ productId, provider, type }: PurchaseButtonProps) {
  const [loading, setLoading] = useState(false);

  const handlePurchase = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/marketplace/checkout?provider=${provider}&productId=${productId}&type=${type}`,
        { method: 'POST' }
      );

      if (!response.ok) {
        throw new Error('Failed to initiate checkout');
      }

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Purchase error:', error);
      alert('Failed to start checkout. Please try again.');
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handlePurchase}
      disabled={loading}
      className="w-full sm:w-auto"
    >
      {loading
        ? 'Loading...'
        : type === 'subscription'
        ? `Subscribe with ${provider === 'stripe' ? 'Stripe' : 'PayPal'}`
        : `Buy with ${provider === 'stripe' ? 'Stripe' : 'PayPal'}`}
    </Button>
  );
}
