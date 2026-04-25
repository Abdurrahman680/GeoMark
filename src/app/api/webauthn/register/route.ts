import { NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import prisma from '@/lib/prisma';
import { origin, rpID, bufferToBase64 } from '@/lib/webauthn';

export async function POST(req: Request) {
  try {
    const { body, email, name, expectedChallenge } = await req.json();

    // In production, expectedChallenge should come from a secure session/cookie
    if (!expectedChallenge) {
      return NextResponse.json({ error: 'Challenge missing from request' }, { status: 400 });
    }

    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });

    if (verification.verified && verification.registrationInfo) {
      const { credential } = verification.registrationInfo;

      // Save user and credential
      const user = await prisma.user.create({
        data: {
          email,
          name,
          webauthnId: credential.id,
          publicKey: bufferToBase64(credential.publicKey) as any,
          counter: BigInt(credential.counter),
        },
      });

      return NextResponse.json({ success: true, userId: user.id });
    } else {
      return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
    }
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
