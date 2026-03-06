import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // In a real backend we'd persist changes; here we echo back for client-side handling.
    return NextResponse.json({ ok: true, body });
  } catch (err) {
    return NextResponse.json({ ok: false, message: 'Invalid body' }, { status: 400 });
  }
}
