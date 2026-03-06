import { NextRequest, NextResponse } from 'next/server';
import { contractsQuerySchema } from '@/lib/schemas/contracts';
import { generateMockContractsResponse } from '@/mocks/contracts';

/**
 * GET /api/contracts
 *
 * BACKEND INTEGRATION:
 * Replace the mock generator with a call to your real backend.
 * Keep the Zod validation for request params.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = contractsQuerySchema.parse({
      page: searchParams.get('page') ?? undefined,
      pageSize: searchParams.get('pageSize') ?? undefined,
      sortBy: searchParams.get('sortBy') ?? undefined,
      sortOrder: searchParams.get('sortOrder') ?? undefined,
    });

    // TODO: Replace with real backend call
    const data = generateMockContractsResponse(query.page, query.pageSize);

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
