import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import Client from '@/lib/db/models/Client';

// GET /api/clients/:id
export async function GET(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const client = await Client.findById(id);
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
    return NextResponse.json(client);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/clients/:id
export async function PUT(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    const client = await Client.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
    return NextResponse.json(client);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// DELETE /api/clients/:id
export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const client = await Client.findByIdAndDelete(id);
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Client deleted' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
