import { NextResponse } from 'next/server';
import { SERVICES } from '@/lib/services';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    if (!patientId) {
      return NextResponse.json({ error: 'patientId is required' }, { status: 400 });
    }
    const res = await fetch(
      `${SERVICES.medicalRecords}/medical-records?patientId=${patientId}`
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Medical records service unavailable' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const res = await fetch(`${SERVICES.medicalRecords}/medical-records/upload`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Medical records service unavailable' }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    const res = await fetch(`${SERVICES.medicalRecords}/medical-records/${id}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Medical records service unavailable' }, { status: 503 });
  }
}
