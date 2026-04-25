import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const org = await prisma.organization.findUnique({ where: { id: 'default' } });
    return NextResponse.json(org);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, data } = await req.json();

    if (action === 'UPDATE_LOCATION') {
      const { lat, lng, address } = data;
      const updated = await prisma.organization.update({
        where: { id: 'default' },
        data: { latitude: lat, longitude: lng, address: address }
      });
      return NextResponse.json({ success: true, settings: updated });
    }

    if (action === 'CHANGE_PASSWORD') {
      const { newPassword } = data;
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: session.user.id },
        data: { password: hashedPassword }
      });
      return NextResponse.json({ success: true, message: 'Password updated successfully' });
    }

    if (action === 'TRANSFER_OWNERSHIP') {
        const { newAdminEmail } = data;
        
        // Find the new admin user
        const newAdmin = await prisma.user.findUnique({ where: { email: newAdminEmail } });
        if (!newAdmin) {
            return NextResponse.json({ error: 'Target user not found. They must register first.' }, { status: 404 });
        }

        // Transaction to swap roles
        await prisma.$transaction([
            prisma.user.update({
                where: { id: session.user.id },
                data: { role: 'USER' }
            }),
            prisma.user.update({
                where: { email: newAdminEmail },
                data: { role: 'ADMIN' }
            })
        ]);

        return NextResponse.json({ success: true, message: `Ownership transferred to ${newAdminEmail}. You are now a guest.` });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
