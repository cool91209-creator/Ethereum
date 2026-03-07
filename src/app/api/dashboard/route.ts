import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:4000';

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/dashboard`, {
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to reach backend' },
      { status: 502 }
    );
  }
}
