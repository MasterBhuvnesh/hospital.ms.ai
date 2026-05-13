import { NextResponse } from 'next/server';
import { SERVICES } from '@/lib/services';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const params = new URLSearchParams();
    const userId = searchParams.get('userId');
    const otherUserId = searchParams.get('otherUserId');
    if (userId) params.set('userId', userId);
    if (otherUserId) params.set('otherUserId', otherUserId);

    const url = `${SERVICES.message}/messages${params.toString() ? `?${params}` : ''}`;
    const res = await fetch(url);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Message service unavailable' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const res = await fetch(`${SERVICES.message}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Message service unavailable' }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Message id required' }, { status: 400 });
    }
    const res = await fetch(`${SERVICES.message}/messages/${id}/read`, {
      method: 'PATCH',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Message service unavailable' }, { status: 503 });
  }
}
