'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isSeries, setIsSeries] = useState(false);
  const [isPublished, setIsPublished] = useState(true);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set('is_series', isSeries.toString());
    formData.set('is_published', isPublished.toString());

    try {
      const response = await fetch('/api/marketplace/products', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to create product');
      }

      router.push('/dashboard/market');
    } catch (error) {
      console.error('Error creating product:', error);
      alert('Failed to create product. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold text-gray-900">Create Product</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            name="title"
            required
            placeholder="React Patterns eBook"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            name="slug"
            required
            placeholder="react-patterns-ebook"
            pattern="[a-z0-9-]+"
            className="mt-1"
          />
          <p className="mt-1 text-xs text-gray-500">
            Lowercase letters, numbers, and hyphens only
          </p>
        </div>

        <div>
          <Label htmlFor="type">Type</Label>
          <select
            id="type"
            name="type"
            required
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          >
            <option value="ebook">eBook</option>
            <option value="newsletter">Newsletter</option>
            <option value="template">Template</option>
          </select>
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            required
            placeholder="A comprehensive guide to..."
            rows={3}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="snippet">Free Snippet</Label>
          <Textarea
            id="snippet"
            name="snippet"
            required
            placeholder="Preview: The first chapter covers..."
            rows={4}
            className="mt-1"
          />
          <p className="mt-1 text-xs text-gray-500">
            This content is visible to everyone for free
          </p>
        </div>

        <div>
          <Label htmlFor="price_cents">Price (cents)</Label>
          <Input
            id="price_cents"
            name="price_cents"
            type="number"
            required
            placeholder="1900"
            min="0"
            className="mt-1"
          />
          <p className="mt-1 text-xs text-gray-500">
            Enter price in cents (e.g., 1900 = $19.00)
          </p>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label htmlFor="is_series" className="text-base">
              Series / Subscription
            </Label>
            <p className="text-sm text-gray-500">
              Enable for recurring subscription products
            </p>
          </div>
          <Switch
            id="is_series"
            checked={isSeries}
            onCheckedChange={setIsSeries}
          />
        </div>

        {isSeries && (
          <div className="rounded-lg border bg-blue-50 p-4">
            <p className="text-sm text-gray-700">
              After creating this product, you'll be able to add series configuration
              and content items.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label htmlFor="is_published" className="text-base">
              Published
            </Label>
            <p className="text-sm text-gray-500">
              Make this product visible in the marketplace
            </p>
          </div>
          <Switch
            id="is_published"
            checked={isPublished}
            onCheckedChange={setIsPublished}
          />
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Product'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
