import { NextResponse } from 'next/server';
import { SERVICES } from '@/lib/services';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const params = new URLSearchParams();
    const patientId = searchParams.get('patientId');
    const doctorId = searchParams.get('doctorId');
    if (patientId) params.set('patientId', patientId);
    if (doctorId) params.set('doctorId', doctorId);

    const url = `${SERVICES.prescription}/prescriptions${params.toString() ? `?${params}` : ''}`;
    const res = await fetch(url);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Prescription service unavailable' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const res = await fetch(`${SERVICES.prescription}/prescriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Prescription service unavailable' }, { status: 503 });
  }
}
