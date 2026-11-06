export const PW_GLOBAL_DEFAULT_SUPPORT_EMAIL = process.env.PW_GLOBAL_SUPPORT_EMAIL || 'pwglobal_support@pw.live';

export const INITIAL_BATCHES = [
  'SAT / Digital SAT Complete Prep 2025-2026',
  'ACT Global FastTrack Batch',
  'JEE Main + Advanced (Global NRI Batch - 11th)',
  'JEE Main + Advanced (Global NRI Batch - 12th)',
  'NEET UG (Global NRI Batch - 11th)',
  'NEET UG (Global NRI Batch - 12th)',
  'CBSE Global Foundation (Grade 9)',
  'CBSE Global Foundation (Grade 10)',
  'CBSE Global Senior (Grade 11 - PCM/PCB)',
  'CBSE Global Senior (Grade 12 - PCM/PCB)',
  'IB Diploma Programme (IBDP HL/SL Math & Sciences)',
  'Cambridge IGCSE & A-Levels Accelerator',
  'AP (Advanced Placement) Calculus & Physics',
  '1-on-1 Personalized Ivy/Global Mentorship Batch'
];

export const LEAD_SOURCES = [
  'Website Form / Inbound Inquiry',
  'Instagram / Meta Ads',
  'Google Ads / Search',
  'Parent / Student Referral',
  'WhatsApp Outreach Campaign',
  'School Counselor / Outreach Event',
  'Webinar / Seminar Attendee',
  'Inbound Support / Call Desk',
  'Direct Counsellor Walk-in',
  'Other Promotional Channel'
];

export const ACADEMIC_YEARS = [
  '2024-2025',
  '2025-2026',
  '2026-2027',
  '2027-2028'
];

export const PROGRAM_TYPES = ['1-1', 'Group'] as const;

export const GROUP_HOURS_OPTIONS = [
  '16 - English',
  '16 - Maths',
  'Complete Course',
  '32 - English & Maths Combined',
  'Custom Hours'
];

export const COUNTRIES = [
  'United Arab Emirates (UAE)',
  'Saudi Arabia (KSA)',
  'India',
  'Qatar',
  'Oman',
  'Kuwait',
  'Bahrain',
  'Singapore',
  'United States (USA)',
  'United Kingdom (UK)',
  'Canada',
  'Australia',
  'Malaysia',
  'Germany',
  'Other Country'
];

export const GRADES = [
  'Grade 6',
  'Grade 7',
  'Grade 8',
  'Grade 9',
  'Grade 10',
  'Grade 11',
  'Grade 12',
  '12th Pass / Dropper / Repeater',
  'IBDP Year 1 (11th)',
  'IBDP Year 2 (12th)',
  'Cambridge IGCSE',
  'Cambridge AS / A-Levels',
  'Undergraduate / College'
];

export const TARGET_EXAM_MONTHS = [
  'March 2025',
  'May 2025',
  'June 2025',
  'August 2025',
  'October 2025',
  'November 2025',
  'December 2025',
  'March 2026',
  'May 2026',
  'June 2026',
  'October 2026',
  'December 2026',
  'May 2027',
  'Not Decided / Flexible'
];

export const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee (INR)' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham (AED)' },
  { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal (SAR)' },
  { code: 'USD', symbol: '$', name: 'US Dollar (USD)' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar (SGD)' },
  { code: 'GBP', symbol: '£', name: 'British Pound (GBP)' },
  { code: 'EUR', symbol: '€', name: 'Euro (EUR)' }
];

export const ADMISSION_TERMS_AND_CONDITIONS = [
  {
    number: '1',
    title: 'Academic Commitment & Rigor',
    text: 'We acknowledge that the student is fully aware of the academic rigor required for the SAT and commits to dedicating their best personal effort throughout the programme to work towards securing admission in colleges. To achieve optimum performance, the student is required to attend all scheduled classes and assessments without exception.'
  },
  {
    number: '2',
    title: 'Payment Schedule Adherence',
    text: 'We agree to strictly adhere to the fee instalment schedule specified in the Fee Schedule above.'
  },
  {
    number: '3',
    title: 'Overdue Accounts & Access Suspension',
    text: "The student's batch access, portal availability, and learning resources will be automatically revoked if any fee instalment remains unpaid 05 calendar days past its due date."
  },
  {
    number: '4',
    title: 'Differential Fee Structure',
    text: 'We acknowledge that Physicswallah Limited reserves the right to apply variable fee structures or merit-based fee adjustments based on the student\'s academic performance and marks obtained.'
  },
  {
    number: '5',
    title: 'Refund Policy',
    text: 'All fees paid are strictly non-refundable and non-transferable.'
  },
  {
    number: '6',
    title: 'Notice of Discontinuation',
    text: 'Parents or students wishing to discontinue the programme must submit an official written notification stating the reason for withdrawal via email to Pwglobal_support@pw.live.'
  },
  {
    number: '7',
    title: 'Schedule & Timetable Adjustments',
    text: 'We understand and agree that Physicswallah Limited reserves the right to modify class schedules, batch timings, or timetables as necessary to fulfill course demands.'
  },
  {
    number: '8',
    title: 'Celebrating Our Students',
    text: "Physicswallah Limited takes pride in celebrating the achievements of its students. We may, from time to time, feature the student's name, photograph, and academic accomplishments in our institutional communications, newsletters, and marketing materials in celebration of their success. This is done at no cost and without any financial or legal claim on the part of the parent or student."
  },
  {
    number: '9',
    title: 'Programme-Specific Enrolment',
    text: "Enrolment and fees paid toward a Physicswallah Limited programme apply exclusively to that programme. As Physicswallah Limited operates as an independent entity with its own fee structure and systems, amounts paid cannot be transferred, converted, or credited toward enrolment in any other Physics Wallah platform or affiliate, including Physics Wallah's India-based platforms, even where operated under the same parent group."
  },
  {
    number: '10',
    title: 'Corporate Identity',
    text: 'PW Global is subbrand under PhysicsWallah Limited.'
  }
];
