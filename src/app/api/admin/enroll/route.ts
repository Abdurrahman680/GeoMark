import { NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import prisma from '@/lib/prisma';
import { rpID, rpName } from '@/lib/webauthn';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { email, name, cnic, department } = await req.json();

    if (!email || !name || !cnic) {
      return NextResponse.json({ error: 'Email, Name, and CNIC are required' }, { status: 400 });
    }

    if (cnic.length !== 13) {
      return NextResponse.json({ error: 'CNIC must be 13 digits' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { cnic }] }
    });

    if (existingUser && existingUser.webauthnId) {
      return NextResponse.json({ error: 'User with this Email or CNIC already exists' }, { status: 400 });
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

    return NextResponse.json({ options, userData: { email, name, cnic, department } });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
