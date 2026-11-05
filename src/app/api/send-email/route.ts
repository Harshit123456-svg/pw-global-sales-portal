import { NextRequest, NextResponse } from 'next/server';
import { getBookingById, saveBooking } from '@/lib/storage';
import { sendEnrollmentEmails } from '@/lib/emailService';

export async function POST(req: NextRequest) {
  try {
    const { bookingId } = await req.json();
    if (!bookingId) {
      return NextResponse.json({ success: false, error: 'bookingId is required' }, { status: 400 });
    }

    const booking = getBookingById(bookingId);
    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking record not found' }, { status: 404 });
    }

    const emailResult = await sendEnrollmentEmails(booking);
    
    booking.emailsSent = {
      student: emailResult.success,
      parent: emailResult.success,
      counsellor: emailResult.success,
      support: emailResult.success,
      timestamp: new Date().toISOString(),
      error: emailResult.errors ? emailResult.errors.join('; ') : undefined,
    };
    saveBooking(booking);

    return NextResponse.json({
      success: true,
      emailResult,
      booking
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
