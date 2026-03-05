import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import Client from '@/lib/db/models/Client';

// GET /api/clients - List all clients
export async function GET() {
  try {
    await dbConnect();
    const clients = await Client.find({}).sort({ createdAt: -1 });
    return NextResponse.json(clients);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/clients - Create a new client
export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const client = await Client.create(body);
    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
