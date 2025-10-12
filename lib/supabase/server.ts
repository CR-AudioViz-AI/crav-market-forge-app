import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { Database } from './types';

export async function createServerClient() {
  const cookieStore = await cookies();

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storage: {
          getItem(key: string) {
            return cookieStore.get(key)?.value ?? null;
          },
          setItem(key: string, value: string) {
            cookieStore.set(key, value);
          },
          removeItem(key: string) {
            cookieStore.delete(key);
          },
        },
      },
    }
  );
}

export async function getSession() {
  const supabase = await createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getUser() {
  const session = await getSession();
  return session?.user ?? null;
}
