import { NextResponse } from 'next/server';
import { SERVICES } from '@/lib/services';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const res = await fetch(`${SERVICES.auth}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Auth service unavailable' }, { status: 503 });
  }
}
