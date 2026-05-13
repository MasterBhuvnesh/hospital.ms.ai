import { NextResponse } from 'next/server';
import { SERVICES } from '@/lib/services';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (body.role) body.role = body.role.toUpperCase();
    const res = await fetch(`${SERVICES.auth}/auth/register`, {
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
