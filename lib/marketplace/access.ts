import { createServerClient } from '@/lib/supabase/server';

export async function userHasProductAccess(
  userId: string | null,
  productId: string
): Promise<boolean> {
  if (!userId) return false;

  const supabase = await createServerClient();

  const result = await supabase
    .from('purchases')
    .select('id, status')
    .eq('user_id' as 'id', userId as any)
    .eq('product_id' as 'id', productId as any)
    .in('status' as 'id', ['paid', 'active'] as any)
    .maybeSingle();

  const purchase = result.data;

  return !!purchase;
}
