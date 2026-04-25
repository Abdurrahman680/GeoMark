import { NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import prisma from '@/lib/prisma';
import { login } from '@/lib/auth';
import { origin, rpID, base64ToBuffer, bufferToBase64 } from '@/lib/webauthn';

export async function POST(req: Request) {
  try {
    const { body, email, expectedChallenge } = await req.json();

    if (!email || !expectedChallenge) {
        return NextResponse.json({ error: 'Email and challenge are required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.publicKey || !user.webauthnId) {
      return NextResponse.json({ error: 'User not found or not registered' }, { status: 404 });
    }

    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: user.webauthnId,
        publicKey: base64ToBuffer(user.publicKey) as any,
        counter: Number(user.counter),
      },
      requireUserVerification: true,
    });

    if (verification.verified) {
      const { newCounter } = verification.authenticationInfo;

      // Update counter
      await prisma.user.update({
        where: { id: user.id },
        data: { counter: BigInt(newCounter) },
      });

      // Create session
      await login({ id: user.id, email: user.email, name: user.name, role: user.role });

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
    }
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
