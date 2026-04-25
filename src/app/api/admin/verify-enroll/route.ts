import { NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import prisma from '@/lib/prisma';
import { origin, rpID, bufferToBase64 } from '@/lib/webauthn';

export async function POST(req: Request) {
  try {
    const { body, userData, expectedChallenge } = await req.json();

    if (!expectedChallenge || !userData) {
      return NextResponse.json({ error: 'Missing challenge or user data' }, { status: 400 });
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

      // Create or update user
      const user = await prisma.user.upsert({
        where: { email: userData.email },
        update: {
          name: userData.name,
          cnic: userData.cnic,
          department: userData.department,
          webauthnId: credential.id,
          publicKey: bufferToBase64(credential.publicKey) as any,
          counter: BigInt(credential.counter),
        },
        create: {
          email: userData.email,
          name: userData.name,
          cnic: userData.cnic,
          department: userData.department,
          webauthnId: credential.id,
          publicKey: bufferToBase64(credential.publicKey) as any,
          counter: BigInt(credential.counter),
        },
      });

      return NextResponse.json({ success: true, userId: user.id });
    } else {
      return NextResponse.json({ error: 'Fingerprint verification failed' }, { status: 400 });
    }
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
