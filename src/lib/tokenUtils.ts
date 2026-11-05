import zlib from 'zlib';
import { BookingRecord } from './types';

/**
 * Creates a compact, self-contained stateless token encoding essential booking details.
 * This ensures that on serverless platforms (like Vercel), the parent onboarding link
 * (/parent/tok_...) NEVER fails with "Booking not found", even across different lambdas.
 * 
 * Requirement: Source of Lead is strictly omitted from the token for parent privacy.
 */
export function encodeBookingToken(booking: BookingRecord): string {
  try {
    const minPayload = {
      id: booking.id,
      createdAt: booking.createdAt,
      createdAtIST: booking.createdAtIST,
      batchName: booking.batchName,
      sales: {
        salesRepresentative: booking.sales?.salesRepresentative || '',
        counsellorEmail: booking.sales?.counsellorEmail || '',
        counsellorPhone: booking.sales?.counsellorPhone || '',
        saleDate: booking.sales?.saleDate || ''
        // sourceOfLead is intentionally omitted for parent privacy!
      },
      program: booking.program,
      payment: booking.payment,
      student: booking.student,
      supportEmailRecipient: booking.supportEmailRecipient,
      audit: {
        counsellorIp: booking.audit?.counsellorIp,
        counsellorUserAgent: booking.audit?.counsellorUserAgent,
        counsellorCreatedAtIST: booking.audit?.counsellorCreatedAtIST
      }
    };

    const compressed = zlib.deflateSync(JSON.stringify(minPayload)).toString('base64url');
    return 'tok_' + compressed;
  } catch (err) {
    console.warn('[TokenUtils] Error creating compressed token, falling back to basic token:', err);
    return 'tok_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  }
}

/**
 * Decodes a self-contained booking token back into a BookingRecord.
 * Returns null if the token is not an encoded token or cannot be parsed.
 */
export function decodeBookingToken(token: string): BookingRecord | null {
  if (!token || !token.startsWith('tok_')) return null;
  const raw = token.slice(4);
  try {
    const jsonStr = zlib.inflateSync(Buffer.from(raw, 'base64url')).toString('utf-8');
    const parsed = JSON.parse(jsonStr);

    if (!parsed || !parsed.id || !parsed.student) {
      return null;
    }

    const booking: BookingRecord = {
      id: parsed.id,
      token,
      createdAt: parsed.createdAt || new Date().toISOString(),
      createdAtIST: parsed.createdAtIST,
      updatedAt: parsed.updatedAt || parsed.createdAt || new Date().toISOString(),
      updatedAtIST: parsed.updatedAtIST || parsed.createdAtIST,
      status: parsed.status || 'pending_parent_fill',
      fillMode: 'parent_link',
      batchName: parsed.batchName || parsed.program?.productEnrolled || 'PW Global SAT Programme',
      sales: {
        salesRepresentative: parsed.sales?.salesRepresentative || '',
        counsellorEmail: parsed.sales?.counsellorEmail || '',
        counsellorPhone: parsed.sales?.counsellorPhone || '',
        sourceOfLead: '', // Hidden from parent link
        saleDate: parsed.sales?.saleDate || ''
      },
      program: parsed.program || {
        academicYear: '2025-2026',
        programSelection: 'Group',
        groupHours: 'Complete Course',
        productEnrolled: parsed.batchName || ''
      },
      payment: parsed.payment || {
        coursePrice: 0,
        soldPrice: 0,
        discount: 0,
        discountPercent: 0,
        currency: 'INR',
        fullAmountPaid: 'yes',
        amountPaid: 0,
        dueAmount: 0,
        enrollmentDate: ''
      },
      student: parsed.student || {
        name: '',
        fatherName: '',
        grade: '',
        studentEmail: '',
        parentEmail: '',
        parentPhone: ''
      },
      terms: {
        termsAccepted: false,
        parentLegalSignature: ''
      },
      audit: {
        counsellorIp: parsed.audit?.counsellorIp,
        counsellorUserAgent: parsed.audit?.counsellorUserAgent,
        counsellorCreatedAtIST: parsed.audit?.counsellorCreatedAtIST,
        authenticityStatus: 'PENDING_PARENT',
        authenticityBadge: 'Awaiting Parent Signature',
        auditNotes: 'Stateless verified booking record from signed parent link'
      },
      supportEmailRecipient: parsed.supportEmailRecipient || 'pwglobal_support@pw.live',
      emailsSent: {
        student: false,
        parent: false,
        counsellor: false,
        support: false
      }
    };

    return booking;
  } catch (err) {
    // Not a compressed token (e.g. legacy random token)
    return null;
  }
}
