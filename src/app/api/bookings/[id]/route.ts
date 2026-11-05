import { NextRequest, NextResponse } from 'next/server';
import { getBookingById, saveBooking, deleteBooking } from '@/lib/storage';
import { sendEnrollmentEmails } from '@/lib/emailService';
import { syncBookingToGoogleSheet } from '@/lib/googleSheet';
import { getNowIST } from '@/lib/timeUtils';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const booking = getBookingById(params.id);
    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
    }

    const isTokenAccess = booking.token === params.id || req.nextUrl.searchParams.get('role') === 'parent';
    
    // REQUIREMENT: Source of Lead should NOT be visible to parent link!
    if (isTokenAccess) {
      const sanitized = JSON.parse(JSON.stringify(booking));
      if (sanitized.sales) {
        delete sanitized.sales.sourceOfLead;
      }
      return NextResponse.json({ success: true, booking: sanitized });
    }

    return NextResponse.json({ success: true, booking });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const existing = getBookingById(params.id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
    }

    const body = await req.json();
    const wasPending = existing.status === 'pending_parent_fill';
    const nowBecomingComplete = body.status === 'completed';
    const nowIST = getNowIST();

    // Capture parent device & network fingerprint for authenticity audit
    const parentSubmitIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || '127.0.0.1';
    const parentSubmitUserAgent = req.headers.get('user-agent') || '';
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(parentSubmitUserAgent);
    const parentDeviceType = isMobile ? 'Mobile' : 'Desktop';

    // Audit determination: Did parent genuinely fill on their own device or is it counsellor?
    let authenticityStatus: 'GENUINE_PARENT' | 'SAME_DEVICE_AS_COUNSELLOR' = 'GENUINE_PARENT';
    let authenticityBadge = `✅ Genuine Parent (${parentDeviceType})`;
    let auditNotes = `Signed remotely by parent on ${parentDeviceType} (IP: ${parentSubmitIp})`;

    const counsellorIp = existing.audit?.counsellorIp;
    const counsellorUA = existing.audit?.counsellorUserAgent;

    // Check if submitted from same IP and same browser as counsellor
    if (counsellorIp && counsellorIp !== '127.0.0.1' && parentSubmitIp === counsellorIp && counsellorUA === parentSubmitUserAgent) {
      authenticityStatus = 'SAME_DEVICE_AS_COUNSELLOR';
      authenticityBadge = '⚠️ Same IP/Device as Counsellor';
      auditNotes = `Flagged: Signed on the same device/network as counsellor (${counsellorIp})`;
    } else if (counsellorIp && counsellorIp === parentSubmitIp) {
      // Local testing or same office Wi-Fi
      authenticityStatus = 'SAME_DEVICE_AS_COUNSELLOR';
      authenticityBadge = '⚠️ Same Network / IP as Counsellor';
      auditNotes = `Submitted from counsellor network IP (${counsellorIp})`;
    }

    // Merge student details
    if (body.student) {
      existing.student = { ...existing.student, ...body.student };
    }

    // Merge program details
    if (body.program) {
      existing.program = { ...existing.program, ...body.program };
      if (body.program.productEnrolled) {
        existing.batchName = body.program.productEnrolled;
      }
    }

    // Merge payment if provided
    if (body.payment) {
      const coursePrice = Number(body.payment.coursePrice ?? existing.payment.coursePrice);
      const soldPrice = Number(body.payment.soldPrice ?? existing.payment.soldPrice);
      const discount = Math.max(0, coursePrice - soldPrice);
      const discountPercent = coursePrice > 0 ? Math.round((discount / coursePrice) * 100) : 0;
      const fullAmountPaid = (body.payment.fullAmountPaid ?? existing.payment.fullAmountPaid) === 'yes' ? 'yes' : 'no';
      const amountPaid = fullAmountPaid === 'yes' ? soldPrice : Number(body.payment.amountPaid ?? existing.payment.amountPaid);
      const dueAmount = fullAmountPaid === 'yes' ? 0 : Math.max(0, soldPrice - amountPaid);

      existing.payment = {
        ...existing.payment,
        ...body.payment,
        coursePrice,
        soldPrice,
        discount,
        discountPercent,
        fullAmountPaid,
        amountPaid,
        dueAmount
      };
    }

    // Merge terms
    if (body.terms) {
      existing.terms = {
        ...existing.terms,
        ...body.terms,
        signedAt: body.terms.signedAt || new Date().toISOString(),
        signedAtIST: nowIST
      };
    }

    // Update audit
    existing.audit = {
      ...existing.audit,
      parentSubmitIp,
      parentSubmitUserAgent,
      parentDeviceType,
      authenticityStatus,
      authenticityBadge,
      auditNotes
    };

    if (body.status) {
      existing.status = body.status;
    }

    existing.updatedAt = new Date().toISOString();
    existing.updatedAtIST = nowIST;

    let emailResult = null;
    let sheetResult = null;

    // If status became completed or user triggered email
    if ((wasPending && nowBecomingComplete) || body.triggerEmail) {
      emailResult = await sendEnrollmentEmails(existing);
      existing.emailsSent = {
        student: emailResult.success,
        parent: emailResult.success,
        counsellor: emailResult.success,
        support: emailResult.success,
        timestamp: new Date().toISOString(),
        timestampIST: nowIST,
        error: emailResult.errors ? emailResult.errors.join('; ') : undefined,
      };

      // Trigger Google Sheet sync with IST timestamps
      sheetResult = await syncBookingToGoogleSheet(existing);
      existing.googleSheetSync = {
        synced: sheetResult.synced,
        timestamp: new Date().toISOString(),
        timestampIST: nowIST,
        error: sheetResult.error
      };
    }

    saveBooking(existing);

    return NextResponse.json({
      success: true,
      booking: existing,
      emailResult,
      sheetResult
    });
  } catch (err: any) {
    console.error('Error updating booking:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const success = deleteBooking(params.id);
    if (!success) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Booking deleted' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
