import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();

    // Check if authenticated and has admin role
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      where: { role: 'USER' },
      include: {
        _count: {
          select: { attendance: true }
        },
        attendance: {
            orderBy: { date: 'desc' }
        }
      }
    });

    // Calculate dynamic stats
    const stats = users.map(user => {
      // Logic for percentage: (Presences) / (Days since enrollment or a fixed number like 30)
      const diffTime = Math.abs(new Date().getTime() - new Date(user.createdAt).getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
      
      const attendanceCount = user._count.attendance;
      const percentage = Math.min(100, (attendanceCount / diffDays) * 100).toFixed(1);

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        cnic: user.cnic,
        department: user.department,
        totalAttendance: attendanceCount,
        percentage: percentage,
        lastActive: user.attendance[0]?.timestamp || null,
      };
    });

    return NextResponse.json(stats);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
