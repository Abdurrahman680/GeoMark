import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

    // Generate date range
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of month

    const users = await prisma.user.findMany({
      where: { role: 'USER' },
      include: {
        attendance: {
          where: {
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    const daysInMonth = endDate.getDate();
    const report = users.map(user => {
      const dailyAttendance: any = {};
      
      // Initialize daily map
      for (let i = 1; i <= daysInMonth; i++) {
        dailyAttendance[i] = { status: 'ABSENT', checkIn: null, checkOut: null };
      }

      user.attendance.forEach(att => {
        const day = new Date(att.date).getDate();
        if (att.type === 'CHECK_IN') {
          dailyAttendance[day].checkIn = att.timestamp;
          dailyAttendance[day].status = att.status; // LATE or PRESENT
        } else {
          dailyAttendance[day].checkOut = att.timestamp;
          if (dailyAttendance[day].status === 'ABSENT' || dailyAttendance[day].status === 'PRESENT') {
              // If they only checked out, or were present but early leave
              if (att.status === 'SHORT_LEAVE') dailyAttendance[day].status = 'SHORT_LEAVE';
              else if (dailyAttendance[day].status === 'ABSENT') dailyAttendance[day].status = 'PRESENT';
          }
        }
      });

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        department: user.department,
        attendance: dailyAttendance,
        totalPresent: Object.values(dailyAttendance).filter((d: any) => d.status !== 'ABSENT').length,
        totalLate: Object.values(dailyAttendance).filter((d: any) => d.status === 'LATE').length,
        totalShortLeave: Object.values(dailyAttendance).filter((d: any) => d.status === 'SHORT_LEAVE').length,
      };
    });

    return NextResponse.json({ report, daysInMonth, month, year });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
