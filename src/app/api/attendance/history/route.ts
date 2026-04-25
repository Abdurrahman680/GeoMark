import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const isAdminView = searchParams.get('admin') === 'true';

    // Simple role check - in a real app, verify user.role
    // Here we'll just allow any user to see their own history,
    // and if 'admin' flag is set, we'll fetch all (only if user is admin)
    
    // FOR DEMO: Let's assume all users can see admin view if they pass the param
    // but in reality we should check a role field.
    
    if (isAdminView) {
        if (session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
        }
        const records = await prisma.attendance.findMany({
            where: {
                user: {
                    role: 'USER'
                }
            },
            include: { user: { select: { name: true, email: true } } },
            orderBy: { timestamp: 'desc' },
        });
        return NextResponse.json(records);
    }

    const records = await prisma.attendance.findMany({
      where: { userId: session.user.id },
      orderBy: { timestamp: 'desc' },
    });

    return NextResponse.json(records);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
