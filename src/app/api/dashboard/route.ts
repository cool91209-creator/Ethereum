import { NextResponse } from 'next/server';
import { generateMockDashboardSummary } from '@/mocks/dashboard';

/**
 * GET /api/dashboard
 *
 * BACKEND INTEGRATION:
 * Replace the mock generator with a call to your real dashboard summary endpoint.
 */
export async function GET() {
  try {
    // TODO: Replace with real backend call
    const data = generateMockDashboardSummary();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
