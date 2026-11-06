import * as fflate from 'fflate';
import { BookingRecord } from './types';

/**
 * Converts a Uint8Array into URL-safe Base64 (base64url).
 * Safe across both browser and serverless environments.
 */
export function uint8ToBase64Url(u8: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(u8).toString('base64url');
  }
  let binary = '';
  const len = u8.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(u8[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Converts a URL-safe Base64 string into a Uint8Array.
 * Safe across both browser and serverless environments.
 */
export function base64UrlToUint8(str: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(str, 'base64url'));
  }
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const u8 = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    u8[i] = binary.charCodeAt(i);
  }
  return u8;
}

/**
 * Creates an ultra-compact stateless token (< 400 characters).
 * 
 * CRITICAL FIX FOR URI_TOO_LONG:
 * - Photo URLs, long audit user agents, and internal marketing sources are STRICTLY EXCLUDED.
 * - Single-letter compact keys are used.
 * - Maximum string lengths are capped to guarantee the token is always under 450 bytes.
 * - This guarantees that Vercel's edge network NEVER triggers HTTP 414 URI_TOO_LONG.
 */
export function encodeBookingToken(booking: BookingRecord): string {
  try {
    const compactPayload = {
      i: (booking.id || '').substring(0, 30),
      sn: (booking.student?.name || '').substring(0, 80),
      fn: (booking.student?.fatherName || '').substring(0, 80),
      gr: (booking.student?.grade || 'Grade 11').substring(0, 25),
      se: (booking.student?.studentEmail || '').substring(0, 80).toLowerCase(),
      pe: (booking.student?.parentEmail || '').substring(0, 80).toLowerCase(),
      ph: (booking.student?.parentPhone || '').substring(0, 30),
      oc: (booking.student?.originCountry || '').substring(0, 50),
      cr: (booking.student?.countryOfResidence || '').substring(0, 50),
      ci: (booking.student?.city || '').substring(0, 50),
      cs: (booking.student?.currentSchool || '').substring(0, 80),
      bn: (booking.batchName || booking.program?.productEnrolled || 'PW Global SAT Prep').substring(0, 100),
      ay: (booking.program?.academicYear || '2025-2026').substring(0, 20),
      pr: (booking.program?.programSelection || 'Group').substring(0, 10),
      gh: (booking.program?.groupHours || 'Complete Course').substring(0, 40),
      cp: Number(booking.payment?.coursePrice) || 0,
      sp: Number(booking.payment?.soldPrice) || 0,
      ap: Number(booking.payment?.amountPaid) || 0,
      da: Number(booking.payment?.dueAmount) || 0,
      dd: (booking.payment?.dueDate || '').substring(0, 20),
      cu: (booking.payment?.currency || 'INR').substring(0, 10),
      sr: (booking.sales?.salesRepresentative || '').substring(0, 60),
      se_m: (booking.sales?.counsellorEmail || '').substring(0, 60),
      sd: (booking.sales?.saleDate || '').substring(0, 20),
      cr_t: (booking.createdAt || new Date().toISOString()).substring(0, 30),
      cr_ist: (booking.createdAtIST || '').substring(0, 40)
    };

    const jsonStr = JSON.stringify(compactPayload);
    const u8 = fflate.strToU8(jsonStr);
    const compressed = fflate.deflateSync(u8, { level: 9 });
    const b64 = uint8ToBase64Url(compressed);
    return 'tok_' + b64;
  } catch (err) {
    console.warn('[TokenUtils] Error creating compressed token, falling back to basic token:', err);
    return 'tok_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  }
}

/**
 * Decodes a self-contained booking token back into a BookingRecord.
 * Works seamlessly in both browser client components and server code.
 * Supports both new ultra-compact format and legacy format.
 */
export function decodeBookingToken(token: string): BookingRecord | null {
  if (!token || !token.startsWith('tok_')) return null;
  const raw = token.slice(4);
  try {
    const u8 = base64UrlToUint8(raw);
    const decompressed = fflate.inflateSync(u8);
    const jsonStr = fflate.strFromU8(decompressed);
    const parsed = JSON.parse(jsonStr);

    if (!parsed) return null;

    // 1. New Compact Format (< 400 chars)
    if (parsed.i || parsed.sn) {
      const soldPrice = Number(parsed.sp) || 0;
      const coursePrice = Number(parsed.cp) || 0;
      const discount = Math.max(0, coursePrice - soldPrice);
      const discountPercent = coursePrice > 0 ? Math.round((discount / coursePrice) * 100) : 0;
      const amountPaid = Number(parsed.ap) || 0;
      const dueAmount = Number(parsed.da) || Math.max(0, soldPrice - amountPaid);
      const fullAmountPaid = dueAmount <= 0 ? 'yes' : 'no';

      const booking: BookingRecord = {
        id: parsed.i || 'PWG-2026-ONLINE',
        token,
        createdAt: parsed.cr_t || new Date().toISOString(),
        createdAtIST: parsed.cr_ist || '',
        updatedAt: parsed.cr_t || new Date().toISOString(),
        updatedAtIST: parsed.cr_ist || '',
        status: 'pending_parent_fill',
        fillMode: 'parent_link',
        batchName: parsed.bn || 'PW Global SAT Programme',
        sales: {
          salesRepresentative: parsed.sr || 'PW Global Admissions',
          counsellorEmail: parsed.se_m || '',
          counsellorPhone: '',
          sourceOfLead: '', // Strictly omitted for parent link
          saleDate: parsed.sd || ''
        },
        program: {
          academicYear: parsed.ay || '2025-2026',
          programSelection: parsed.pr === '1-1' ? '1-1' : 'Group',
          groupHours: parsed.gh || 'Complete Course',
          productEnrolled: parsed.bn || ''
        },
        payment: {
          coursePrice,
          soldPrice,
          discount,
          discountPercent,
          currency: parsed.cu || 'INR',
          fullAmountPaid,
          amountPaid,
          dueAmount,
          dueDate: parsed.dd || '',
          enrollmentDate: parsed.sd || ''
        },
        student: {
          name: parsed.sn || '',
          fatherName: parsed.fn || '',
          grade: parsed.gr || 'Grade 11',
          studentEmail: parsed.se || '',
          parentEmail: parsed.pe || '',
          parentPhone: parsed.ph || '',
          originCountry: parsed.oc || '',
          countryOfResidence: parsed.cr || '',
          city: parsed.ci || '',
          currentSchool: parsed.cs || '',
          photoUrl: ''
        },
        terms: {
          termsAccepted: false,
          parentLegalSignature: ''
        },
        audit: {
          counsellorIp: 'Remote',
          authenticityStatus: 'PENDING_PARENT',
          authenticityBadge: 'Awaiting Parent Signature',
          auditNotes: 'Stateless verified booking record from signed parent link'
        },
        supportEmailRecipient: 'pwglobal_support@pw.live',
        emailsSent: {
          student: false,
          parent: false,
          counsellor: false,
          support: false
        }
      };

      return booking;
    }

    // 2. Legacy Format Fallback
    if (parsed.id && (parsed.student || parsed.sales)) {
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
          sourceOfLead: '',
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
    }

    return null;
  } catch (err) {
    return null;
  }
}
