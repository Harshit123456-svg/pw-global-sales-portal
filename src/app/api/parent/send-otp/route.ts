import { NextRequest, NextResponse } from 'next/server';
import { getBookingById, saveBooking } from '@/lib/storage';
import { decodeBookingToken } from '@/lib/tokenUtils';
import { generate4DigitOtp, createChallengeToken, maskEmail } from '@/lib/otpService';
import { sendParentOtpEmail } from '@/lib/emailService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const idOrToken = body.bookingId || body.token;

    if (!idOrToken) {
      return NextResponse.json({ success: false, error: 'Booking ID or token is required' }, { status: 400 });
    }

    let booking = getBookingById(idOrToken);
    if (!booking && body.token) {
      booking = decodeBookingToken(body.token);
    }
    if (!booking && body.originalBooking) {
      booking = body.originalBooking;
    }

    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking record not found' }, { status: 404 });
    }

    const parentEmail = (booking.student?.parentEmail || '').trim().toLowerCase();
    if (!parentEmail || !parentEmail.includes('@')) {
      return NextResponse.json({
        success: false,
        error: 'No valid parent email address found for this student. Please contact your PW Global sales counsellor.'
      }, { status: 400 });
    }

    // Generate random 4-digit code (e.g. 4829)
    const otp = generate4DigitOtp();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes
    const challengeToken = createChallengeToken(booking.id, parentEmail, otp, expiresAt, 0);

    // Save OTP state to booking
    booking.parentOtp = {
      code: otp,
      expiresAt: new Date(expiresAt).toISOString(),
      verified: false,
      sentAt: new Date().toISOString(),
      attempts: 0
    };
    saveBooking(booking);

    // Send 4-digit OTP email to parent
    const emailResult = await sendParentOtpEmail(booking, otp);
    const isLiveDelivered = emailResult.success && !emailResult.simulated;

    return NextResponse.json({
      success: true,
      maskedEmail: maskEmail(parentEmail),
      challengeToken,
      expiresAt,
      emailStatus: isLiveDelivered ? 'dispatched' : 'unconfigured',
      fallbackOtp: !isLiveDelivered ? otp : undefined,
      emailNotice: !isLiveDelivered
        ? 'Live parent email delivery is currently unconfigured. To send emails automatically, please update your Google Apps Script or enter SMTP in Settings.'
        : undefined
    });
  } catch (err: any) {
    console.error('[send-otp error]:', err);
    return NextResponse.json({ success: false, error: err.message || 'Failed to send OTP' }, { status: 500 });
  }
}
