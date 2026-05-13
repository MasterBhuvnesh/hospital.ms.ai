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

    const url = `${SERVICES.appointment}/appointments${params.toString() ? `?${params}` : ''}`;
    const res = await fetch(url);
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error('GET /api/appointments proxy error:', err);
    return NextResponse.json({ error: 'Appointment service unavailable' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const res = await fetch(`${SERVICES.appointment}/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error('POST /api/appointments proxy error:', err);
    return NextResponse.json({ error: 'Appointment service unavailable' }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const res = await fetch(`${SERVICES.appointment}/appointments/${body.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: body.status }),
    });

    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error('PUT /api/appointments proxy error:', err);
    return NextResponse.json({ error: 'Appointment service unavailable' }, { status: 503 });
  }
}
