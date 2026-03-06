import { NextRequest, NextResponse } from 'next/server';
import { metricsQuerySchema } from '@/lib/schemas/metrics';
import { generateMockMetricsResponse } from '@/mocks/metrics';

/**
 * GET /api/metrics?from=&to=&page=&pageSize=
 *
 * BACKEND INTEGRATION:
 * Replace the mock generator with a call to your real metrics backend.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = metricsQuerySchema.parse({
      from: searchParams.get('from') ?? undefined,
      to: searchParams.get('to') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      pageSize: searchParams.get('pageSize') ?? undefined,
    });

    // TODO: Replace with real backend call
    const data = generateMockMetricsResponse(query.page, query.pageSize);

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Invalid query parameters' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
