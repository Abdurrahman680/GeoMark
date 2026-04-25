import { NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import prisma from '@/lib/prisma';
import { rpID, base64ToBuffer } from '@/lib/webauthn';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.webauthnId) {
      return NextResponse.json({ error: 'User not found or not registered with WebAuthn' }, { status: 404 });
    }

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: [
        {
          id: user.webauthnId,
          transports: ['internal'] as any,
        },
      ],
      userVerification: 'required',
    });

    return NextResponse.json(options);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
