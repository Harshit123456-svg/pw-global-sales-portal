import nodemailer from 'nodemailer';
import { BookingRecord } from './types';
import { PW_GLOBAL_DEFAULT_SUPPORT_EMAIL } from './constants';
import { getSettings } from './settingsService';
import { PW_GLOBAL_LOGO_BASE64 } from './logoBase64';

// 1. FINAL CERTIFIED ADMISSION CONFIRMATION EMAIL (Sent once parent has signed TnCs)
function generateEmailHtml(booking: BookingRecord): string {
  const { student, payment, sales, program, terms, id } = booking;
  const currency = payment.currency || 'INR';
  const currencySymbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'AED' ? 'AED' : currency;

  const isFullPaid = payment.fullAmountPaid === 'yes';
  const salesRepName = sales?.salesRepresentative || 'PW Global Admissions Team';
  const salesRepEmail = sales?.counsellorEmail || '';
  const batchName = program?.productEnrolled || booking.batchName;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>PW Global Admission Confirmation - ${id}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #1e293b; }
    .container { max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08); border: 1px solid #e2e8f0; }
    .header { background: #ffffff; padding: 28px 30px; text-align: center; border-bottom: 3px solid #4f46e5; }
    .header img { max-height: 52px; width: auto; margin-bottom: 10px; }
    .header h1 { margin: 6px 0 2px 0; font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; }
    .header p { margin: 0; font-size: 12px; color: #64748b; letter-spacing: 1px; text-transform: uppercase; font-weight: 600; }
    .content { padding: 30px; }
    .welcome-card { background: #f8fafc; border-left: 4px solid #10b981; padding: 18px 20px; border-radius: 8px; margin-bottom: 24px; }
    .welcome-card h2 { margin: 0 0 6px 0; font-size: 18px; color: #065f46; }
    .welcome-card p { margin: 0; font-size: 13.5px; color: #475569; line-height: 1.5; }
    .critical-alert { background: #fffbeb; border: 1.5px solid #fde68a; border-radius: 10px; padding: 16px; margin-bottom: 24px; }
    .critical-alert-title { color: #92400e; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .critical-alert-body { color: #78350f; font-size: 13.5px; font-weight: 500; margin: 0; }
    .section-title { font-size: 15px; font-weight: 700; color: #0f172a; margin: 26px 0 12px 0; padding-bottom: 6px; border-bottom: 2px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
    .table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    .table td { padding: 9px 12px; font-size: 13.5px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
    .table td.label { width: 40%; color: #64748b; font-weight: 500; }
    .table td.value { width: 60%; color: #0f172a; font-weight: 600; }
    .pill { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700; }
    .pill-paid { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
    .pill-due { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
    .pill-batch { background: #e0e7ff; color: #3730a3; border: 1px solid #c7d2fe; }
    .due-box { background: #fef2f2; border: 1.5px solid #f87171; border-radius: 10px; padding: 14px; margin-top: 12px; color: #991b1b; font-size: 13px; }
    .signature-card { background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 12px; padding: 16px; margin: 20px 0; }
    .footer { background: #f8fafc; padding: 22px 30px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${PW_GLOBAL_LOGO_BASE64}" alt="PhysicsWallah Global Logo" />
      <h1>PHYSICS WALLAH GLOBAL</h1>
      <p>Official Admission Confirmed &amp; Signed Enrolment Record</p>
      <div style="margin-top: 8px; font-size: 12px; color: #64748b;">
        Admission Ref: <strong>${id}</strong> &bull; Sale Date: ${sales?.saleDate || payment.enrollmentDate} &bull; Academic Year: ${program?.academicYear || '2025-2026'}
      </div>
    </div>

    <div class="content">
      <div class="welcome-card">
        <h2>Admission Confirmed: ${student.name}</h2>
        <p>Congratulations! All enrollment terms have been digitally signed and verified for <strong>${batchName}</strong>. This official document confirms admission status as <strong>CONFIRMED</strong>.</p>
      </div>

      <!-- DIGITAL SIGNATURE VERIFICATION CARD -->
      <div class="signature-card">
        <div style="font-size: 13px; font-weight: 800; color: #166534; text-transform: uppercase; margin-bottom: 4px;">
          &#10003; Legally Binding Admission Terms Signed &amp; Accepted
        </div>
        <div style="font-size: 14px; color: #14532d;">
          Parent / Guardian Electronic Signature: <strong style="font-family: Georgia, serif; font-size: 16px;">${terms?.parentLegalSignature || 'Signed by Parent'}</strong>
        </div>
        <div style="font-size: 11.5px; color: #15803d; margin-top: 4px;">
          Signed Timestamp: ${terms?.signedAt || new Date().toISOString()} &bull; All 10 Admission Rules &amp; Terms Confirmed.
        </div>
      </div>

      <!-- CRITICAL WARNING BOX FOR STUDENT EMAIL -->
      <div class="critical-alert">
        <div class="critical-alert-title">
          <span>&#9888; MANDATORY STUDENT PORTAL ACCESS NOTICE</span>
        </div>
        <p class="critical-alert-body">
          Digital portal access and live classes are locked exclusively to:
          <br>
          <strong style="font-size: 15px; color: #92400e;">${student.studentEmail}</strong>
          <br>
          <span style="font-size: 12px; color: #b45309;">(Note: This email ID CANNOT be changed later under any circumstances).</span>
        </p>
      </div>

      <!-- STUDENT DETAILS -->
      <div class="section-title">
        <span>1. Student Profile &amp; Residency</span>
      </div>

      <table class="table">
        <tr>
          <td class="label">Student Full Name</td>
          <td class="value"><strong>${student.name}</strong></td>
        </tr>
        <tr>
          <td class="label">Father's Name</td>
          <td class="value">${student.fatherName}</td>
        </tr>
        <tr>
          <td class="label">Grade / Class</td>
          <td class="value"><span class="pill pill-batch">${student.grade}</span></td>
        </tr>
        <tr>
          <td class="label">Student Mail ID (Access)</td>
          <td class="value"><strong style="color: #4f46e5;">${student.studentEmail}</strong></td>
        </tr>
        <tr>
          <td class="label">Parent Email ID</td>
          <td class="value">${student.parentEmail}</td>
        </tr>
        <tr>
          <td class="label">Parent WhatsApp / Phone</td>
          <td class="value">${student.parentPhone}</td>
        </tr>
        <tr>
          <td class="label">Country of Residence</td>
          <td class="value">${student.countryOfResidence || 'N/A'}</td>
        </tr>
        <tr>
          <td class="label">City of Residence</td>
          <td class="value">${student.city || 'N/A'}</td>
        </tr>
        <tr>
          <td class="label">Origin Country</td>
          <td class="value">${student.originCountry || 'N/A'}</td>
        </tr>
        <tr>
          <td class="label">Current School</td>
          <td class="value">${student.currentSchool || 'N/A'}</td>
        </tr>
        <tr>
          <td class="label">Target Score</td>
          <td class="value">${student.targetScore || 'Target Max'}</td>
        </tr>
        <tr>
          <td class="label">Target Exam Month</td>
          <td class="value">${student.targetExamMonth || 'Scheduled'}</td>
        </tr>
      </table>

      <!-- PROGRAM DETAILS -->
      <div class="section-title">
        <span>2. Academic Program Details</span>
      </div>

      <table class="table">
        <tr>
          <td class="label">Product Enrolled</td>
          <td class="value"><strong style="color: #4338ca;">${batchName}</strong></td>
        </tr>
        <tr>
          <td class="label">Program Selection</td>
          <td class="value"><strong>${program?.programSelection || 'Group'}</strong></td>
        </tr>
        ${program?.programSelection === 'Group' ? `
        <tr>
          <td class="label">Group Hours / Modules</td>
          <td class="value"><strong>${program?.groupHours || 'Complete Course'}</strong></td>
        </tr>` : ''}
        <tr>
          <td class="label">Course Start Date</td>
          <td class="value">${program?.courseStartDate || 'Immediate'}</td>
        </tr>
        <tr>
          <td class="label">Course End Date</td>
          <td class="value">${program?.courseEndDate || 'Course Completion'}</td>
        </tr>
      </table>

      <!-- PAYMENT DETAILS -->
      <div class="section-title">
        <span>3. Fee Statement &amp; Due Terms</span>
        <span class="pill ${isFullPaid ? 'pill-paid' : 'pill-due'}">
          ${isFullPaid ? 'FULL PAYMENT RECEIVED' : 'PARTIAL PAYMENT / BALANCE DUE'}
        </span>
      </div>

      <table class="table">
        <tr>
          <td class="label">Standard Course Price</td>
          <td class="value"><span style="text-decoration: line-through; color: #94a3b8;">${currencySymbol} ${payment.coursePrice.toLocaleString()}</span></td>
        </tr>
        <tr>
          <td class="label">Scholarship / Approved Discount</td>
          <td class="value" style="color: #059669;">
            -${currencySymbol} ${payment.discount.toLocaleString()} (${payment.discountPercent}% OFF)
          </td>
        </tr>
        <tr>
          <td class="label">Agreed Sold Price</td>
          <td class="value"><strong style="font-size: 15px; color: #0f172a;">${currencySymbol} ${payment.soldPrice.toLocaleString()}</strong></td>
        </tr>
        <tr>
          <td class="label">Amount Paid to Date</td>
          <td class="value" style="color: #166534; font-weight: 700;">${currencySymbol} ${payment.amountPaid.toLocaleString()}</td>
        </tr>
      </table>

      ${!isFullPaid ? `
        <div class="due-box">
          <div style="font-weight: 700; font-size: 13px; margin-bottom: 4px;">
            &#128197; Balance Payment Reminder:
          </div>
          <div>Pending Due Amount: <strong>${currencySymbol} ${payment.dueAmount.toLocaleString()}</strong></div>
          <div style="margin-top: 4px;">Strict Due Date: <strong style="text-decoration: underline;">${payment.dueDate || 'Within 30 Days'}</strong></div>
          <div style="margin-top: 4px; font-size: 11px; opacity: 0.9;">
            *Notice: Batch access will be revoked if any fee remains unpaid 02 calendar days past due date.
          </div>
        </div>
      ` : ''}

      <!-- SALES REP -->
      <div class="section-title">
        <span>4. Assigned Sales Representative</span>
      </div>

      <table class="table">
        <tr>
          <td class="label">Sales Representative</td>
          <td class="value"><strong>${salesRepName}</strong></td>
        </tr>
        ${salesRepEmail ? `
        <tr>
          <td class="label">Counsellor Email</td>
          <td class="value"><a href="mailto:${salesRepEmail}" style="color: #4f46e5;">${salesRepEmail}</a></td>
        </tr>` : ''}
        <tr>
          <td class="label">Global Support Desk</td>
          <td class="value"><strong>${booking.supportEmailRecipient || PW_GLOBAL_DEFAULT_SUPPORT_EMAIL}</strong></td>
        </tr>
      </table>
    </div>

    <div class="footer">
      <div>&copy; ${new Date().getFullYear()} <strong>PhysicsWallah Global (PW Global)</strong>. All Rights Reserved.</div>
      <div style="margin-top: 4px; font-size: 11px;">PW Global is a subbrand under PhysicsWallah Limited.</div>
    </div>
  </div>
</body>
</html>
  `;
}

// 2. PARENT INVITATION & SIGNING EMAIL (Sent immediately when counsellor creates booking)
function generateParentSigningInviteHtml(booking: BookingRecord, signingUrl: string): string {
  const { student, payment, sales, program, id } = booking;
  const currency = payment.currency || 'INR';
  const currencySymbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'AED' ? 'AED' : currency;
  const batchName = program?.productEnrolled || booking.batchName;
  const salesRepName = sales?.salesRepresentative || 'PW Global Admissions Team';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Action Required: Review & Sign Admission Terms - ${student.name || 'Student'}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #1e293b; }
    .container { max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08); border: 1px solid #e2e8f0; }
    .header { background: #ffffff; padding: 28px 30px; text-align: center; border-bottom: 3px solid #4f46e5; }
    .header img { max-height: 50px; width: auto; margin-bottom: 10px; }
    .header h1 { margin: 6px 0 2px 0; font-size: 20px; font-weight: 800; color: #0f172a; }
    .content { padding: 30px; }
    .action-card { background: #eff6ff; border: 2px solid #bfdbfe; border-radius: 14px; padding: 22px; text-align: center; margin-bottom: 24px; }
    .action-btn { display: inline-block; background: #4f46e5; color: #ffffff !important; font-weight: 800; font-size: 15px; padding: 14px 28px; border-radius: 10px; text-decoration: none; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3); margin-top: 14px; }
    .warning-box { background: #fffbeb; border: 1.5px solid #fde68a; border-radius: 10px; padding: 14px; font-size: 13px; color: #92400e; margin-bottom: 20px; }
    .table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 13.5px; }
    .table td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; }
    .table td.label { color: #64748b; font-weight: 500; width: 40%; }
    .table td.value { color: #0f172a; font-weight: 700; width: 60%; }
    .footer { background: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${PW_GLOBAL_LOGO_BASE64}" alt="PhysicsWallah Global" />
      <h1>PHYSICS WALLAH GLOBAL</h1>
      <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 700; margin-top: 4px;">
        Action Required &bull; Admission Enrolment &amp; Terms Signature
      </div>
    </div>

    <div class="content">
      <h2 style="color: #0f172a; margin-top: 0; font-size: 18px;">
        Dear ${student.fatherName || 'Parent / Guardian'} &amp; ${student.name || 'Student'},
      </h2>
      <p style="font-size: 14px; color: #475569; line-height: 1.5;">
        Greetings from <strong>PhysicsWallah Global</strong>! Your assigned sales representative, <strong>${salesRepName}</strong>, has initiated the admission booking for <strong>${batchName}</strong> (Ref: <strong style="font-family: monospace;">${id}</strong>).
      </p>

      <!-- IMPORTANT ACTION CALLOUT -->
      <div class="action-card">
        <div style="font-size: 16px; font-weight: 800; color: #1e3a8a;">
          Parent Action Required: Review Details &amp; Sign Admission Terms
        </div>
        <p style="font-size: 13px; color: #3b82f6; margin: 6px 0 0 0;">
          Without reading, accepting, and digitally signing the official Admission Rules &amp; Terms, the enrollment <strong>cannot be confirmed</strong>.
        </p>
        <a href="${signingUrl}" class="action-btn" target="_blank">
          &rarr; Review Details &amp; Sign Document
        </a>
        <div style="font-size: 11px; color: #64748b; margin-top: 10px;">
          (Click the button above or open this secure link in your browser)
        </div>
      </div>

      <div class="warning-box">
        <strong>⚠️ Crucial Portal Access Policy:</strong> Student digital portal access and live classes will be linked exclusively to <strong>${student.studentEmail || 'the student email specified'}</strong>. This email cannot be changed later under any circumstances.
      </div>

      <div style="font-weight: 700; font-size: 14px; color: #0f172a; margin-bottom: 8px; border-bottom: 2px solid #f1f5f9; padding-bottom: 4px;">
        Enrolment Summary
      </div>

      <table class="table">
        <tr>
          <td class="label">Student Name</td>
          <td class="value">${student.name || 'To be completed'}</td>
        </tr>
        <tr>
          <td class="label">Grade / Class</td>
          <td class="value">${student.grade}</td>
        </tr>
        <tr>
          <td class="label">Enrolled Batch</td>
          <td class="value" style="color: #4338ca;">${batchName}</td>
        </tr>
        <tr>
          <td class="label">Agreed Sold Price</td>
          <td class="value">${currencySymbol} ${payment.soldPrice.toLocaleString()}</td>
        </tr>
        <tr>
          <td class="label">Payment Status</td>
          <td class="value">
            ${payment.fullAmountPaid === 'yes' ? 'Paid in Full' : `Partial (Due: ${currencySymbol} ${payment.dueAmount.toLocaleString()} by ${payment.dueDate})`}
          </td>
        </tr>
      </table>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; font-size: 12px; color: #64748b; word-break: break-all;">
        <strong>Direct Link:</strong> <a href="${signingUrl}" style="color: #4f46e5;">${signingUrl}</a>
      </div>
    </div>

    <div class="footer">
      <div>&copy; ${new Date().getFullYear()} <strong>PhysicsWallah Global (PW Global)</strong>. All Rights Reserved.</div>
      <div style="margin-top: 4px; font-size: 11px;">PW Global is a subbrand under PhysicsWallah Limited.</div>
    </div>
  </div>
</body>
</html>
  `;
}

// Helper: Dispatches email to recipient list
async function dispatchEmail(recipients: string[], subject: string, html: string) {
  const settings = getSettings();
  const smtpHost = settings.smtpHost;
  const smtpPort = settings.smtpPort || 587;
  const smtpUser = settings.smtpUser;
  const smtpPass = settings.smtpPass;
  const smtpFrom = settings.smtpFrom || `PW Global Admissions <${smtpUser || 'noreply@pw.live'}>`;

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
        tls: { rejectUnauthorized: false }
      });

      const promises = recipients.map(to => 
        transporter.sendMail({ from: smtpFrom, to, subject, html })
      );

      const results = await Promise.allSettled(promises);
      const errors: string[] = [];
      results.forEach((res, i) => {
        if (res.status === 'rejected') {
          errors.push(`Failed to send to ${recipients[i]}: ${res.reason?.message || res.reason}`);
        }
      });

      return {
        success: errors.length === 0,
        recipients,
        html,
        errors: errors.length > 0 ? errors : undefined,
        simulated: false
      };
    } catch (err: any) {
      console.error('SMTP sending error:', err);
      return { success: false, recipients, html, errors: [err.message], simulated: false };
    }
  }

  console.log('--- PW GLOBAL EMAIL DISPATCH (SIMULATED: CONFIGURE SMTP IN SETTINGS) ---');
  console.log(`Recipients: ${recipients.join(', ')}`);
  console.log(`Subject: ${subject}`);
  console.log('------------------------------------------------------------------------');

  return {
    success: true,
    recipients,
    html,
    simulated: true,
    errors: ['SMTP not configured yet. Configure in Settings or .env.local to send live emails to parent inboxes.']
  };
}

// Export 1: Send Parent Signing Invitation Email (When counsellor submits sales form)
export async function sendParentSigningInviteEmail(booking: BookingRecord, baseUrl: string) {
  const signingUrl = booking.token?.startsWith('tok_')
    ? `${baseUrl}/parent/${booking.id}?t=${booking.token}`
    : `${baseUrl}/parent/${booking.token || booking.id}`;
  const parentEmail = booking.student.parentEmail;
  const salesEmail = booking.sales?.counsellorEmail;

  const recipients = [parentEmail, salesEmail].filter(Boolean) as string[];
  const subject = `[Action Required] Review & Sign Admission Terms: ${booking.student.name || 'Student'} (${booking.batchName}) - Ref: ${booking.id}`;
  const html = generateParentSigningInviteHtml(booking, signingUrl);

  return dispatchEmail(recipients, subject, html);
}

// Export 2: Send Final Confirmed Admission Copies (When parent signs TnCs)
export async function sendEnrollmentEmails(booking: BookingRecord) {
  const { student, sales } = booking;
  const supportEmail = booking.supportEmailRecipient || PW_GLOBAL_DEFAULT_SUPPORT_EMAIL;

  const recipients = [
    student.parentEmail,
    student.studentEmail,
    sales?.counsellorEmail,
    supportEmail
  ].filter(Boolean) as string[];

  const subject = `[PW Global Confirmed] Official Admission & Signed Enrolment: ${student.name} (${booking.batchName}) - Ref: ${booking.id}`;
  const html = generateEmailHtml(booking);

  return dispatchEmail(recipients, subject, html);
}

export { generateEmailHtml, generateParentSigningInviteHtml };
