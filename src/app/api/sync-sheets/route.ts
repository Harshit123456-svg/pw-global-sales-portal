import { NextRequest, NextResponse } from 'next/server';
import { getAllBookings, saveBooking } from '@/lib/storage';
import { syncBookingToGoogleSheet } from '@/lib/googleSheet';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const bookings = getAllBookings();

    if (body.bookingId) {
      const b = bookings.find(item => item.id === body.bookingId);
      if (!b) {
        return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
      }
      const syncRes = await syncBookingToGoogleSheet(b);
      b.googleSheetSync = {
        synced: syncRes.synced,
        timestamp: new Date().toISOString(),
        error: syncRes.error
      };
      saveBooking(b);
      return NextResponse.json({ success: syncRes.synced, result: syncRes });
    }

    // Sync all records
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (const b of bookings) {
      const syncRes = await syncBookingToGoogleSheet(b);
      if (syncRes.synced) {
        successCount++;
        b.googleSheetSync = {
          synced: true,
          timestamp: new Date().toISOString()
        };
      } else {
        failCount++;
        if (syncRes.error && !errors.includes(syncRes.error)) {
          errors.push(syncRes.error);
        }
      }
      saveBooking(b);
    }

    return NextResponse.json({
      success: successCount > 0 || bookings.length === 0,
      total: bookings.length,
      successCount,
      failCount,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
