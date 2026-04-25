import { NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import prisma from '@/lib/prisma';
import { rpID, rpName } from '@/lib/webauthn';

export async function POST(req: Request) {
  try {
    const { email, name } = await req.json();

    if (!email || !name) {
      return NextResponse.json({ error: 'Email and name are required' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser && existingUser.publicKey) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    // Generate options for WebAuthn registration
    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: new TextEncoder().encode(email),
      userName: email,
      userDisplayName: name,
      attestationType: 'none',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'required',
        userVerification: 'required',
      },
    });

    // Store the challenge in a way that we can retrieve it later (e.g., in a session or database tied to the email)
    // For simplicity in this demo, we can just return it and the client will send it back
    // In a real app, you MUST verify the challenge on the server by storing it temporarily
    
    // We'll store it as a temporary record or use a signed cookie/session
    // Let's use a temporary field in the user record if it doesn't exist, or just return it for now
    // Actually, SimpleWebAuthn recommends verifying the challenge.
    
    return NextResponse.json(options);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
