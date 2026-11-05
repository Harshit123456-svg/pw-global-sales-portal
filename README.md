# 🚀 PW Global - Admissions Booking & Student Onboarding Portal

Official Admissions & Sales Portal for **PhysicsWallah Global (PW Global)** sales counsellors and international parents, featuring automated **Google Sheets synchronization**, **direct parent email dispatch**, and **legally binding digital terms & conditions acceptance**.

---

## 🌟 What's New in this Update

1. **Authentic PW Global Logo**: Updated across the entire application, receipts, and email templates with the official circular "PW" badge and blue vortex "GLOBAL" branding.
2. **Google Sheets Real-Time Storage**:
   * Every sales entry and completed parent onboarding automatically inserts a detailed row into your Google Sheet in real time!
   * Built-in 60-second Google Apps Script webhook integration with 1-click script copier and connection tester in the portal settings.
   * Includes a **"Sync to Google Sheet"** button in the Sales Records table.
3. **Comprehensive Field Schema (Zero Duplication)**:
   * **Sales Representative & Sale Date**
   * **Source of Lead**: Stored for internal tracking and sales reports, **strictly hidden from the parent view**.
   * **Academic Year**: Dropdown (2024-2025, 2025-2026, 2026-2027, etc.)
   * **Program Selection**: `1-1` (Personalized Mentorship) or `Group`
   * **Group Hours Selection**: `16 - English`, `16 - Maths`, `Complete Course`, `32 - English & Maths Combined`, or Custom Hours.
   * **Course Start Date & Course End Date**
   * **Product Enrolled (Full Batch Name)**: Dynamic uniform batch dropdown. Counsellors can add a new batch directly; once added, it is locked into the global list for all counsellors to ensure 100% uniformity across the team.
   * **Student Name, Student E-mail ID** (with non-changeable access lock warning), **Father Name, Grade, Parent Email ID, Parent Contact No.**
   * **Origin Country**
   * **Mandatory in Parent Link**: **Country of Residence\*** and **City\***
4. **Admission Rules & Terms (TnCs) + Digital Legal Signature**:
   * Clearly displayed on Step 2 of the parent link with all 10 legal clauses:
     1. Academic Commitment & Rigor
     2. Payment Schedule Adherence
     3. Overdue Accounts & Access Suspension (revocation 02 calendar days past due date)
     4. Differential Fee Structure
     5. Refund Policy (strictly non-refundable)
     6. Notice of Discontinuation (to `pwglobal_support@pw.live`)
     7. Schedule & Timetable Adjustments
     8. Celebrating Our Students
     11. Programme-Specific Enrolment (Physics Wallah Gulf regional entity terms)
     12. PW Global corporate identity under PhysicsWallah Limited
   * **Mandatory Agreement Checkbox**: The parent must check the agreement box. If not checked, the submit button is completely disabled.
   * **Digital Legal Signature**: Parent enters their full legal name as an electronic signature.
5. **Direct Parent Email Delivery (SMTP)**:
   * In-app SMTP setup tool with an instant **"Send Test Email"** button to verify delivery directly to your inbox.
   * Dispatches branded HTML confirmation directly to **Parent Email**, **Student Mail ID**, **Counsellor Email**, and **PW Global Support**.

---

## 📊 Google Sheets Setup (60 Seconds)

1. Open your target Google Sheet.
2. In the menu, click **Extensions &rarr; Apps Script**.
3. In the portal, click **"Google Sheet & Mail Setup"** &rarr; click **"Copy Google Apps Script Code"**.
4. Paste the code into the Apps Script editor.
5. Click **Deploy &rarr; New deployment**:
   * Select type: **Web app**
   * Execute as: **Me**
   * Who has access: **Anyone**
6. Click **Deploy**, copy the generated **Web app URL**, paste it into the portal settings, and click **"Test Google Sheet Connection"**!

---

## 📧 Email (SMTP) Configuration

Go to **"Google Sheet & Mail Setup" &rarr; "2. Direct Parent Email (SMTP)"**:
* **SMTP Host:** `smtp.gmail.com`
* **SMTP Port:** `587`
* **Username:** `your-email@gmail.com` or `admissions.global@pw.live`
* **Password:** 16-character Google App Password ([Create here](https://myaccount.google.com/apppasswords))
* Type your email in the test box and click **"Send Test Email"** to verify live delivery!

---

## 🚀 Running Locally & Web Hosting

### Local Run:
```bash
npm install
npm run dev
# Open http://localhost:3000
```

### Direct Web Hosting (Vercel):
1. Push this folder to GitHub.
2. Import repository in [Vercel](https://vercel.com) and click **Deploy**.
3. Add your `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, and `GOOGLE_SHEET_WEBHOOK_URL` in the Vercel Environment Variables.
