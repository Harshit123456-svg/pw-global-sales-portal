import { NextRequest, NextResponse } from 'next/server';
import { getSettings, saveSettings } from '@/lib/settingsService';
import nodemailer from 'nodemailer';
import { PW_GLOBAL_LOGO_BASE64 } from '@/lib/logoBase64';

export async function GET() {
  try {
    const s = getSettings();
    return NextResponse.json({
      success: true,
      settings: {
        smtpHost: s.smtpHost,
        smtpPort: s.smtpPort,
        smtpUser: s.smtpUser,
        hasSmtpPass: Boolean(s.smtpPass),
        smtpFrom: s.smtpFrom,
        supportEmail: s.supportEmail,
        googleSheetWebhookUrl: s.googleSheetWebhookUrl
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // If this is a test email request
    if (body.action === 'test_email') {
      const { testEmail, smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom } = body;
      if (!testEmail) {
        return NextResponse.json({ success: false, error: 'Recipient test email address is required' }, { status: 400 });
      }

      const activeHost = smtpHost || getSettings().smtpHost;
      const activePort = Number(smtpPort || getSettings().smtpPort) || 587;
      const activeUser = smtpUser || getSettings().smtpUser;
      const activePass = smtpPass || getSettings().smtpPass;
      const fromAddress = smtpFrom || getSettings().smtpFrom || `PW Global <${activeUser}>`;

      if (!activeHost || !activeUser || !activePass) {
        return NextResponse.json({
          success: false,
          error: 'Missing SMTP credentials. Please enter SMTP Host, Username/Email, and App Password.'
        }, { status: 400 });
      }

      const transporter = nodemailer.createTransport({
        host: activeHost,
        port: activePort,
        secure: activePort === 465,
        auth: {
          user: activeUser,
          pass: activePass
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      // Verify connection first
      await transporter.verify();

      // Send test message with authentic PW Global logo
      await transporter.sendMail({
        from: fromAddress,
        to: testEmail,
        subject: '[PW Global] SMTP Test Email - Admissions System',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="${PW_GLOBAL_LOGO_BASE64}" alt="PW Global" style="max-height: 48px;" />
            </div>
            <h2 style="color: #0f172a; margin-top: 0;">PhysicsWallah Global - Email System Operational!</h2>
            <p style="color: #334155; font-size: 14px; line-height: 1.6;">
              This is a live test email confirming that your SMTP connection is properly configured.
              All admissions confirmations and student onboarding records will be dispatched directly from this email to parents and students.
            </p>
            <div style="background: #f1f5f9; padding: 12px; border-radius: 8px; font-size: 12px; color: #475569; margin: 16px 0;">
              <div><strong>Host:</strong> ${activeHost}:${activePort}</div>
              <div><strong>Sender:</strong> ${fromAddress}</div>
              <div><strong>Timestamp:</strong> ${new Date().toISOString()}</div>
            </div>
            <p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 24px;">
              &copy; ${new Date().getFullYear()} PhysicsWallah Global. Admissions Tech.
            </p>
          </div>
        `
      });

      return NextResponse.json({
        success: true,
        message: `Test email successfully delivered to ${testEmail}!`
      });
    }

    // If this is a test Google Sheet webhook request
    if (body.action === 'test_sheet') {
      const webhookUrl = body.webhookUrl || getSettings().googleSheetWebhookUrl;
      if (!webhookUrl || !webhookUrl.startsWith('http')) {
        return NextResponse.json({ success: false, error: 'A valid Google Apps Script Webhook URL is required' }, { status: 400 });
      }

      const testPayload = {
        id: 'TEST-CONNECTION',
        saleDate: new Date().toISOString().split('T')[0],
        academicYear: '2025-2026',
        salesRepresentative: 'System Verification Test',
        sourceOfLead: 'Direct Test',
        studentName: 'Verification Student',
        fatherName: 'Parent Guardian',
        grade: 'Grade 11',
        studentEmail: 'student.test@pw.live',
        parentEmail: 'parent.test@pw.live',
        parentPhone: '+971 50 000 0000',
        originCountry: 'India',
        countryOfResidence: 'UAE',
        city: 'Dubai',
        programSelection: 'Group',
        groupHours: 'Complete Course',
        courseStartDate: '2025-06-01',
        courseEndDate: '2025-12-31',
        productEnrolled: 'SAT / Digital SAT Complete Prep 2025-2026',
        coursePrice: 60000,
        soldPrice: 50000,
        discount: 10000,
        discountPercent: 17,
        fullAmountPaid: 'yes',
        amountPaid: 50000,
        dueAmount: 0,
        dueDate: '',
        termsAccepted: true,
        parentLegalSignature: 'Parent Electronic Signature Test',
        signedAt: new Date().toISOString(),
        currentSchool: 'Test Academy',
        status: 'completed'
      };

      if (webhookUrl.includes('/dev')) {
        return NextResponse.json({
          success: false,
          error: "Your Google Sheet Webhook URL ends in '/dev'. Google blocks external API calls to '/dev' test URLs with HTTP 401. Please use the Production Web App URL ending in '/exec' (in Apps Script: click Deploy > Manage deployments > copy the Web app URL ending in /exec)."
        }, { status: 400 });
      }

      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'text/plain;charset=utf-8' 
        },
        body: JSON.stringify(testPayload),
        redirect: 'follow'
      });

      if (res.status === 401 || res.status === 403) {
        throw new Error(
          "Google Apps Script returned HTTP 401 Unauthorized. " +
          "This happens when 'Who has access' was not set to 'Anyone' during deployment. " +
          "Fix in 30 seconds: Open your Google Sheet > Extensions > Apps Script > Deploy > Manage deployments > " +
          "click Edit (pencil icon) > Under 'Who has access', change it from 'Only myself' to 'Anyone' > click Deploy."
        );
      }

      if (!res.ok) {
        throw new Error(`Google Sheet Webhook returned HTTP error status ${res.status}. Please check your script deployment.`);
      }

      return NextResponse.json({
        success: true,
        message: 'Successfully connected and inserted a test verification row in your Google Sheet (IST)!'
      });
    }

    // Otherwise, save updated settings
    const updates: any = {};
    if (body.smtpHost !== undefined) updates.smtpHost = body.smtpHost.trim();
    if (body.smtpPort !== undefined) updates.smtpPort = Number(body.smtpPort);
    if (body.smtpUser !== undefined) updates.smtpUser = body.smtpUser.trim();
    if (body.smtpPass) updates.smtpPass = body.smtpPass.trim(); // only update if non-empty
    if (body.smtpFrom !== undefined) updates.smtpFrom = body.smtpFrom.trim();
    if (body.supportEmail !== undefined) updates.supportEmail = body.supportEmail.trim();
    if (body.googleSheetWebhookUrl !== undefined) updates.googleSheetWebhookUrl = body.googleSheetWebhookUrl.trim();

    const saved = saveSettings(updates);

    return NextResponse.json({
      success: true,
      message: 'Settings saved successfully',
      settings: {
        smtpHost: saved.smtpHost,
        smtpPort: saved.smtpPort,
        smtpUser: saved.smtpUser,
        hasSmtpPass: Boolean(saved.smtpPass),
        smtpFrom: saved.smtpFrom,
        supportEmail: saved.supportEmail,
        googleSheetWebhookUrl: saved.googleSheetWebhookUrl
      }
    });
  } catch (err: any) {
    console.error('Settings API error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
