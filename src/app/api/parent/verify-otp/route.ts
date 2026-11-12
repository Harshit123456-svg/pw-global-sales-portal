import { NextRequest, NextResponse } from 'next/server';
import { getBookingById, saveBooking } from '@/lib/storage';
import { decodeBookingToken } from '@/lib/tokenUtils';
import { verifyEnteredOtp } from '@/lib/otpService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const idOrToken = body.bookingId || body.token;
    const enteredOtp = (body.enteredOtp || '').toString().trim();
    const challengeToken = body.challengeToken;

    if (!idOrToken) {
      return NextResponse.json({ success: false, error: 'Booking identifier is required' }, { status: 400 });
    }

    if (!enteredOtp || enteredOtp.length !== 4) {
      return NextResponse.json({ success: false, error: 'Please enter a valid 4-digit numeric code' }, { status: 400 });
    }

    let booking = getBookingById(idOrToken);
    if (!booking && body.token) {
      booking = decodeBookingToken(body.token);
    }

    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking record not found' }, { status: 404 });
    }

    const parentEmail = (booking.student?.parentEmail || '').trim().toLowerCase();
    const storedOtp = booking.parentOtp?.code;
    const storedExpiresAt = booking.parentOtp?.expiresAt;

    const verification = verifyEnteredOtp(
      booking.id,
      parentEmail,
      enteredOtp,
      challengeToken,
      storedOtp,
      storedExpiresAt
    );

    if (!verification.success) {
      if (booking.parentOtp) {
        booking.parentOtp.attempts = (booking.parentOtp.attempts || 0) + 1;
        saveBooking(booking);
      }
      return NextResponse.json({
        success: false,
        error: verification.error || 'Incorrect verification code',
        remainingAttempts: verification.remainingAttempts
      }, { status: 400 });
    }

    // OTP Verified! Mark verified and record timestamp
    if (booking.parentOtp) {
      booking.parentOtp.verified = true;
      saveBooking(booking);
    }

    return NextResponse.json({
      success: true,
      unlockToken: verification.unlockToken
    });
  } catch (err: any) {
    console.error('[verify-otp error]:', err);
    return NextResponse.json({ success: false, error: err.message || 'Verification failed' }, { status: 500 });
  }
}
