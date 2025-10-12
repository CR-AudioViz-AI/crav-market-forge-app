import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();

  try {
    const supabase = await createServerClient();

    // Test database connectivity with a lightweight query
    const { error: dbError } = await supabase
      .from('products')
      .select('id')
      .limit(1)
      .single();

    const dbStatus = dbError && dbError.code !== 'PGRST116' ? 'unhealthy' : 'healthy';
    const responseTime = Date.now() - startTime;

    const health = {
      status: dbStatus === 'healthy' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: dbStatus,
          responseTime: `${responseTime}ms`,
        },
        api: {
          status: 'healthy',
        },
      },
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
    };

    const statusCode = health.status === 'ok' ? 200 : 503;

    return NextResponse.json(health, {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Health check failed:', error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
        },
      }
    );
  }
}
