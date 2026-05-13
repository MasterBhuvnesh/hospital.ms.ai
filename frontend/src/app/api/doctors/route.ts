import { NextResponse } from 'next/server';
import { SERVICES } from '@/lib/services';

export async function GET() {
  try {
    const res = await fetch(`${SERVICES.doctor}/doctors`);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Doctor service unavailable' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const res = await fetch(`${SERVICES.doctor}/doctors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Doctor service unavailable' }, { status: 503 });
  }
}
