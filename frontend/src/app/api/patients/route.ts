import { NextResponse } from 'next/server';
import { SERVICES } from '@/lib/services';

export async function GET() {
  try {
    const res = await fetch(`${SERVICES.patient}/patients`);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Patient service unavailable' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const res = await fetch(`${SERVICES.patient}/patients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Patient service unavailable' }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Patient id required' }, { status: 400 });

    const res = await fetch(`${SERVICES.patient}/patients/${id}`, {
      method: 'DELETE',
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Patient service unavailable' }, { status: 503 });
  }
}
