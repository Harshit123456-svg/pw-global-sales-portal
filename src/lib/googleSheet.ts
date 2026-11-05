import { BookingRecord } from './types';
import { getSettings } from './settingsService';
import { GOOGLE_APPS_SCRIPT_TEMPLATE } from './googleSheetTemplate';
import { formatToIST, getNowIST } from './timeUtils';

export { GOOGLE_APPS_SCRIPT_TEMPLATE };

export function formatBookingForGoogleSheet(b: BookingRecord) {
  const auditBadge = b.audit?.authenticityBadge || (b.status === 'completed' ? 'Verified Enrolment' : 'Pending Signature');
  
  let deviceAuditInfo = '';
  if (b.audit?.parentDeviceType) {
    deviceAuditInfo = `${b.audit.parentDeviceType} (IP: ${b.audit.parentSubmitIp || 'Remote'})`;
  } else if (b.audit?.authenticityStatus === 'SAME_DEVICE_AS_COUNSELLOR') {
    deviceAuditInfo = `Same Device/IP as Counsellor (${b.audit.counsellorIp || 'Local'})`;
  } else if (b.audit?.authenticityStatus === 'COUNSELLOR_DIRECT') {
    deviceAuditInfo = `Counsellor Entry (${b.audit.counsellorIp || 'Office'})`;
  }

  return {
    id: b.id,
    saleDate: b.sales?.saleDate || b.payment?.enrollmentDate,
    academicYear: b.program?.academicYear || '2025-2026',
    salesRepresentative: b.sales?.salesRepresentative || b.counsellor?.counsellorName || '',
    sourceOfLead: b.sales?.sourceOfLead || 'Direct Inquiry',
    authenticityBadge: auditBadge,
    deviceAuditInfo,
    studentName: b.student?.name || '',
    fatherName: b.student?.fatherName || '',
    grade: b.student?.grade || '',
    studentEmail: b.student?.studentEmail || '',
    parentEmail: b.student?.parentEmail || '',
    parentPhone: b.student?.parentPhone || '',
    originCountry: b.student?.originCountry || '',
    countryOfResidence: b.student?.countryOfResidence || '',
    city: b.student?.city || '',
    programSelection: b.program?.programSelection || 'Group',
    groupHours: b.program?.groupHours || 'Complete Course',
    courseStartDate: b.program?.courseStartDate || '',
    courseEndDate: b.program?.courseEndDate || '',
    productEnrolled: b.program?.productEnrolled || b.batchName,
    coursePrice: b.payment?.coursePrice || 0,
    soldPrice: b.payment?.soldPrice || 0,
    discount: b.payment?.discount || 0,
    discountPercent: b.payment?.discountPercent || 0,
    fullAmountPaid: b.payment?.fullAmountPaid || 'yes',
    amountPaid: b.payment?.amountPaid || 0,
    dueAmount: b.payment?.dueAmount || 0,
    dueDate: b.payment?.dueDate || '',
    termsAccepted: b.terms?.termsAccepted || false,
    parentLegalSignature: b.terms?.parentLegalSignature || '',
    signedAtIST: b.terms?.signedAt ? formatToIST(b.terms.signedAt) : '',
    currentSchool: b.student?.currentSchool || '',
    mockTestScore: b.student?.mockTestScore || '',
    targetScore: b.student?.targetScore || '',
    targetExamMonth: b.student?.targetExamMonth || '',
    targetSchool: b.student?.targetSchool || '',
    status: b.status,
    submissionTimestampIST: getNowIST()
  };
}

export async function syncBookingToGoogleSheet(booking: BookingRecord): Promise<{
  synced: boolean;
  message?: string;
  error?: string;
}> {
  const settings = getSettings();
  const webhookUrl = settings.googleSheetWebhookUrl;

  if (!webhookUrl || !webhookUrl.startsWith('http')) {
    console.log('[GoogleSheet] No webhook URL configured.');
    return {
      synced: false,
      error: 'Google Sheet Webhook URL is not configured. Add it in Settings.'
    };
  }

  if (webhookUrl.includes('/dev')) {
    return {
      synced: false,
      error: "Google Sheet URL ends in '/dev'. Use the production URL ending in '/exec' from Deploy > Manage deployments."
    };
  }

  try {
    const payload = formatBookingForGoogleSheet(booking);
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error("Google returned HTTP 401. In Apps Script, set 'Who has access' to 'Anyone' in Deploy > Manage deployments.");
    }

    if (!response.ok) {
      throw new Error(`Google Sheet Webhook returned HTTP ${response.status}`);
    }

    const data = await response.json().catch(() => ({ result: 'ok' }));
    return {
      synced: true,
      message: 'Successfully recorded & sorted in Google Sheet (IST)'
    };
  } catch (err: any) {
    console.error('[GoogleSheet] Error syncing row:', err);
    return {
      synced: false,
      error: err.message || 'Failed to sync with Google Sheet'
    };
  }
}
