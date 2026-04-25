import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type: manualType, lat, lng, deviceId, photo } = await req.json().catch(() => ({}));

    // Fetch User and Organization Settings
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    const org = await prisma.organization.findUnique({ where: { id: 'default' } });
    
    if (!user) {
        return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    if (user.role === 'ADMIN') {
        return NextResponse.json({ error: 'Admins cannot mark attendance as employees.' }, { status: 403 });
    }

    // 1. Device Binding Logic
    if (!deviceId) {
        return NextResponse.json({ error: 'Device ID is required for secure attendance.' }, { status: 400 });
    }

    if (!user.deviceId) {
        // Bind device on first use
        await prisma.user.update({
            where: { id: user.id },
            data: { deviceId: deviceId }
        });
    } else if (user.deviceId !== deviceId) {
        return NextResponse.json({ 
            error: 'This device is not registered. Attendance is only allowed from your registered device.' 
        }, { status: 403 });
    }

    // 2. Geofencing enforcement
    const OFFICE_LAT = org?.latitude || 33.5793; 
    const OFFICE_LNG = org?.longitude || 73.0638;
    const ALLOWED_RADIUS_METERS = 100; // Updated to 100m as per request

    if (!lat || !lng) {
        return NextResponse.json({ error: 'Location data is required.' }, { status: 400 });
    }

    function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
        const R = 6371e3; // Earth radius in meters
        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const Δφ = ((lat2 - lat1) * Math.PI) / 180;
        const Δλ = ((lon2 - lon1) * Math.PI) / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // Distance in meters
    }

    const distance = calculateDistance(lat, lng, OFFICE_LAT, OFFICE_LNG);

    if (distance > ALLOWED_RADIUS_METERS) {
        return NextResponse.json({ 
            error: `You are outside the allowed location. Distance: ${Math.round(distance)}m.` 
        }, { status: 403 });
    }

    // 3. Selfie Verification (Mocking storage if Cloudinary keys missing)
    let photoUrl = null;
    if (photo) {
        const { uploadSelfie } = await import('@/lib/cloudinary');
        photoUrl = await uploadSelfie(photo, session.user.id);
        
        // If upload failed (e.g. no keys), we still proceed but log it or use a placeholder
        if (!photoUrl && process.env.NODE_ENV === 'development') {
            photoUrl = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200"; // Placeholder
        }
    }

    const now = new Date();
    // Use Date.UTC to ensure the local date is preserved when Prisma converts to UTC for @db.Date
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    
    // Automatic logic if type not provided
    let type = manualType;
    if (!type) {
        const hour = now.getHours();
        type = hour < 12 ? 'CHECK_IN' : 'CHECK_OUT';
    }

    // Check dependency: Cannot check out if not checked in
    if (type === 'CHECK_OUT') {
        const checkInRecord = await prisma.attendance.findFirst({
            where: {
                userId: session.user.id,
                date: today,
                type: 'CHECK_IN'
            }
        });

        if (!checkInRecord) {
            return NextResponse.json({ 
                error: 'Cannot mark Check-Out: You must Check-In first for today.' 
            }, { status: 400 });
        }
    }

    // Check if already marked for this type today
    const existing = await prisma.attendance.findFirst({
        where: {
            userId: session.user.id,
            date: today,
            type: type
        }
    });

    if (existing) {
        return NextResponse.json({ 
            error: `Already marked ${type.replace('_', ' ')} for today.` 
        }, { status: 400 });
    }

    // Logic for Status
    let status = 'PRESENT';
    const hour = now.getHours();
    
    if (type === 'CHECK_IN' && hour >= 11) {
        status = 'LATE';
    } else if (type === 'CHECK_OUT' && hour < 13) {
        status = 'SHORT_LEAVE';
    }

    const attendance = await prisma.attendance.create({
      data: {
        userId: session.user.id,
        date: today,
        type: type,
        status: status,
        timestamp: now,
        latitude: lat,
        longitude: lng,
        deviceId: deviceId,
        photoUrl: photoUrl
      },
    });

    return NextResponse.json({ success: true, attendance });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
