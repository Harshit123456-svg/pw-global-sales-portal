import { NextRequest, NextResponse } from 'next/server';
import { getAllBookings, saveBooking } from '@/lib/storage';
import { sendEnrollmentEmails, sendParentSigningInviteEmail } from '@/lib/emailService';
import { syncBookingToGoogleSheet } from '@/lib/googleSheet';
import { addBatchIfNew } from '@/lib/batchService';
import { BookingRecord } from '@/lib/types';
import { PW_GLOBAL_DEFAULT_SUPPORT_EMAIL } from '@/lib/constants';
import { getNowIST } from '@/lib/timeUtils';
import { encodeBookingToken } from '@/lib/tokenUtils';

function generateBookingId(): string {
  const random = Math.floor(1000 + Math.random() * 9000);
  const year = new Date().getFullYear();
  return `PWG-${year}-${random}`;
}

function generateToken(): string {
  return 'tok_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

export async function GET() {
  try {
    const bookings = getAllBookings();
    return NextResponse.json({ success: true, bookings });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const id = body.id || generateBookingId();
    const token = body.token || generateToken();
    const now = new Date().toISOString();
    const nowIST = getNowIST();

    const coursePrice = Number(body.payment?.coursePrice) || 0;
    const soldPrice = Number(body.payment?.soldPrice) || 0;
    const discount = Math.max(0, coursePrice - soldPrice);
    const discountPercent = coursePrice > 0 ? Math.round((discount / coursePrice) * 100) : 0;
    
    const fullAmountPaid = body.payment?.fullAmountPaid === 'yes' ? 'yes' : 'no';
    const amountPaid = fullAmountPaid === 'yes' ? soldPrice : (Number(body.payment?.amountPaid) || 0);
    const dueAmount = fullAmountPaid === 'yes' ? 0 : Math.max(0, soldPrice - amountPaid);

    const productEnrolled = (body.program?.productEnrolled || body.batchName || 'SAT / Digital SAT Complete Prep 2025-2026').trim();
    if (productEnrolled) {
      addBatchIfNew(productEnrolled);
    }

    // Capture counsellor network / device fingerprint for auditing
    const counsellorIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || '127.0.0.1';
    const counsellorUserAgent = req.headers.get('user-agent') || 'Browser';

    // Status: Enrollment will NOT be confirmed until parent signs TnCs
    const isSigned = Boolean(body.terms?.termsAccepted && body.terms?.parentLegalSignature?.trim());
    const initialStatus = isSigned ? 'completed' : 'pending_parent_fill';

    const booking: BookingRecord = {
      id,
      token,
      createdAt: now,
      createdAtIST: nowIST,
      updatedAt: now,
      updatedAtIST: nowIST,
      status: initialStatus,
      fillMode: body.fillMode || 'counsellor_direct',
      batchName: productEnrolled,
      sales: {
        salesRepresentative: body.sales?.salesRepresentative || body.counsellor?.counsellorName || '',
        counsellorEmail: body.sales?.counsellorEmail || body.counsellor?.counsellorEmail || '',
        counsellorPhone: body.sales?.counsellorPhone || body.counsellor?.counsellorPhone || '',
        sourceOfLead: body.sales?.sourceOfLead || 'Direct Inquiry',
        saleDate: body.sales?.saleDate || body.payment?.enrollmentDate || nowIST.split(',')[0]
      },
      program: {
        academicYear: body.program?.academicYear || '2025-2026',
        programSelection: body.program?.programSelection || 'Group',
        groupHours: body.program?.groupHours || 'Complete Course',
        courseStartDate: body.program?.courseStartDate || '',
        courseEndDate: body.program?.courseEndDate || '',
        productEnrolled
      },
      payment: {
        coursePrice,
        soldPrice,
        discount,
        discountPercent,
        currency: body.payment?.currency || 'INR',
        fullAmountPaid,
        amountPaid,
        dueAmount,
        dueDate: body.payment?.dueDate || '',
        enrollmentDate: body.payment?.enrollmentDate || nowIST.split(',')[0],
        paymentMode: body.payment?.paymentMode || 'Online Payment',
        transactionRef: body.payment?.transactionRef || '',
      },
      student: {
        name: body.student?.name || '',
        fatherName: body.student?.fatherName || '',
        grade: body.student?.grade || '',
        studentEmail: (body.student?.studentEmail || '').trim().toLowerCase(),
        parentEmail: (body.student?.parentEmail || '').trim().toLowerCase(),
        parentPhone: (body.student?.parentPhone || '').trim(),
        originCountry: body.student?.originCountry || '',
        countryOfResidence: body.student?.countryOfResidence || '',
        city: body.student?.city || '',
        currentSchool: body.student?.currentSchool || '',
        mockTestScore: body.student?.mockTestScore || '',
        targetScore: body.student?.targetScore || '',
        targetExamMonth: body.student?.targetExamMonth || '',
        targetSchool: body.student?.targetSchool || '',
        photoUrl: body.student?.photoUrl || '',
      },
      terms: {
        termsAccepted: isSigned,
        parentLegalSignature: body.terms?.parentLegalSignature || '',
        signedAt: isSigned ? (body.terms?.signedAt || now) : undefined,
        signedAtIST: isSigned ? nowIST : undefined
      },
      audit: {
        counsellorIp,
        counsellorUserAgent,
        counsellorCreatedAtIST: nowIST,
        authenticityStatus: isSigned ? 'COUNSELLOR_DIRECT' : 'PENDING_PARENT',
        authenticityBadge: isSigned ? 'Counsellor Direct Entry' : 'Awaiting Parent Signature',
        auditNotes: `Booking initiated by counsellor from IP: ${counsellorIp}`
      },
      supportEmailRecipient: body.supportEmailRecipient || PW_GLOBAL_DEFAULT_SUPPORT_EMAIL,
      emailsSent: {
        student: false,
        parent: false,
        counsellor: false,
        support: false,
      }
    };

    // Ensure token is a self-contained, stateless compressed token so parent links never fail on Vercel
    if (!body.token) {
      booking.token = encodeBookingToken(booking);
    }

    const host = req.headers.get('host') || 'localhost:3000';
    const proto = req.headers.get('x-forwarded-proto') || 'http';
    const baseUrl = `${proto}://${host}`;

    let emailResult = null;

    // Send parent signing link directly to parent email
    if (!isSigned && booking.student.parentEmail) {
      emailResult = await sendParentSigningInviteEmail(booking, baseUrl);
      booking.emailsSent = {
        student: false,
        parent: emailResult.success,
        counsellor: emailResult.success,
        support: false,
        timestamp: new Date().toISOString(),
        timestampIST: nowIST,
        error: emailResult.errors ? emailResult.errors.join('; ') : undefined,
      };
    } else if (isSigned) {
      emailResult = await sendEnrollmentEmails(booking);
      booking.emailsSent = {
        student: emailResult.success,
        parent: emailResult.success,
        counsellor: emailResult.success,
        support: emailResult.success,
        timestamp: new Date().toISOString(),
        timestampIST: nowIST,
        error: emailResult.errors ? emailResult.errors.join('; ') : undefined,
      };
    }

    // Sync to Google Sheet (Sorted with IST timestamps)
    let sheetResult = await syncBookingToGoogleSheet(booking);
    booking.googleSheetSync = {
      synced: sheetResult.synced,
      timestamp: new Date().toISOString(),
      timestampIST: nowIST,
      error: sheetResult.error
    };

    saveBooking(booking);

    return NextResponse.json({
      success: true,
      booking,
      parentSigningUrl: `${baseUrl}/parent/${booking.token}`,
      emailResult,
      sheetResult
    });
  } catch (err: any) {
    console.error('Error creating booking:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
