'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { PW_GLOBAL_LOGO_BASE64 } from '@/lib/logoBase64';
import { Printer, ArrowLeft, ShieldAlert, CheckCircle2, Clock, Check } from 'lucide-react';
import { BookingRecord } from '@/lib/types';
import Link from 'next/link';

export default function ReceiptPage() {
  const params = useParams();
  const idOrToken = params?.id as string;

  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBooking() {
      try {
        setLoading(true);
        const res = await fetch(`/api/bookings/${idOrToken}`);
        const data = await res.json();
        if (!res.ok || !data.success || !data.booking) {
          throw new Error(data.error || 'Receipt not found');
        }
        setBooking(data.booking);
      } catch (err: any) {
        setErrorMsg(err.message || 'Error loading receipt');
      } finally {
        setLoading(false);
      }
    }

    if (idOrToken) {
      fetchBooking();
    }
  }, [idOrToken]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (errorMsg || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="bg-white p-6 rounded-xl max-w-sm text-center">
          <p className="text-sm text-red-600 font-bold mb-3">{errorMsg || 'Receipt not found'}</p>
          <Link href="/" className="text-xs text-indigo-600 font-bold underline">Return to Admissions Portal</Link>
        </div>
      </div>
    );
  }

  const { student, payment, sales, program, terms } = booking;
  const currencySymbol = payment.currency === 'INR' ? '₹' : payment.currency === 'USD' ? '$' : payment.currency === 'AED' ? 'AED' : payment.currency;
  const isFullPaid = payment.fullAmountPaid === 'yes';
  const batchName = program?.productEnrolled || booking.batchName;

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 print:p-0 print:bg-white text-slate-800">
      
      {/* Top action bar - Hidden during print */}
      <div className="max-w-3xl mx-auto mb-6 flex items-center justify-between print:hidden">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Admissions Desk</span>
        </Link>

        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition"
        >
          <Printer className="w-4 h-4" />
          <span>Print / Save as PDF</span>
        </button>
      </div>

      {/* Official Receipt Paper Container */}
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden print:border-none print:shadow-none print:rounded-none">
        
        {/* Header with uploaded authentic PW Global Logo */}
        <div className="bg-slate-900 text-white p-8 border-b-4 border-indigo-600">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="bg-white inline-block p-2 rounded-xl">
                <img
                  src={PW_GLOBAL_LOGO_BASE64}
                  alt="PhysicsWallah Global"
                  className="h-10 w-auto object-contain"
                />
              </div>
              <p className="text-slate-300 text-xs mt-2 uppercase tracking-widest font-semibold">
                Official Student Enrolment &amp; Admission Record
              </p>
            </div>

            <div className="sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Admission Ref</span>
              <span className="font-mono text-base font-extrabold text-white tracking-wider">{booking.id}</span>
              <div className="text-xs text-slate-400 mt-0.5">Sale Date: {sales?.saleDate || payment.enrollmentDate}</div>
              <div className="text-xs text-slate-400">Academic Year: {program?.academicYear || '2025-2026'}</div>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6">
          
          {/* Status Badge */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase">Product Enrolled</span>
              <div className="text-lg font-extrabold text-indigo-700 mt-0.5">{batchName}</div>
              <div className="text-xs text-slate-600 mt-0.5">
                Format: {program?.programSelection || 'Group'} {program?.groupHours ? `(${program.groupHours})` : ''}
              </div>
            </div>
            
            <div className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
              isFullPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {isFullPaid ? 'Paid in Full' : 'Partial Payment - Due Pending'}
            </div>
          </div>

          {/* Access Email Disclaimer Alert */}
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-extrabold text-amber-900 uppercase tracking-wide">
                Strict Portal Access Policy
              </div>
              <p className="text-xs font-medium text-amber-900/90 mt-0.5">
                Portal and class authorization will be provided exclusively to Student Mail ID: <strong>{student.studentEmail}</strong>. This email cannot be changed later under any circumstances.
              </p>
            </div>
          </div>

          {/* Student Profile Section */}
          <div>
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2 mb-3">
              1. Student Academic Profile &amp; Residency
            </h3>

            <div className="flex flex-col sm:flex-row gap-6">
              {student.photoUrl && (
                <div className="shrink-0 flex flex-col items-center">
                  <img
                    src={student.photoUrl}
                    alt="Student"
                    className="w-24 h-24 rounded-xl object-cover border-2 border-slate-200 shadow-xs"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 font-semibold">Student ID Photo</span>
                </div>
              )}

              <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div>
                  <span className="text-slate-500 font-semibold block text-[11px]">Student Name:</span>
                  <span className="font-bold text-slate-900 text-sm">{student.name}</span>
                </div>

                <div>
                  <span className="text-slate-500 font-semibold block text-[11px]">Father&apos;s Name:</span>
                  <span className="font-bold text-slate-900 text-sm">{student.fatherName}</span>
                </div>

                <div>
                  <span className="text-slate-500 font-semibold block text-[11px]">Grade / Class:</span>
                  <span className="font-bold text-slate-900">{student.grade}</span>
                </div>

                <div>
                  <span className="text-slate-500 font-semibold block text-[11px]">Student Mail ID:</span>
                  <span className="font-bold text-indigo-700">{student.studentEmail}</span>
                </div>

                <div>
                  <span className="text-slate-500 font-semibold block text-[11px]">Parent Email:</span>
                  <span className="font-medium text-slate-800">{student.parentEmail}</span>
                </div>

                <div>
                  <span className="text-slate-500 font-semibold block text-[11px]">Parent Contact:</span>
                  <span className="font-medium text-slate-800">{student.parentPhone}</span>
                </div>

                <div>
                  <span className="text-slate-500 font-semibold block text-[11px]">Origin Country:</span>
                  <span className="font-medium text-slate-800">{student.originCountry || 'N/A'}</span>
                </div>

                <div>
                  <span className="text-slate-500 font-semibold block text-[11px]">Country &amp; City of Residence:</span>
                  <span className="font-bold text-slate-900">{student.city || 'N/A'}, {student.countryOfResidence || 'N/A'}</span>
                </div>

                <div>
                  <span className="text-slate-500 font-semibold block text-[11px]">Current School:</span>
                  <span className="font-medium text-slate-800">{student.currentSchool || 'N/A'}</span>
                </div>

                <div>
                  <span className="text-slate-500 font-semibold block text-[11px]">Mock Test Score:</span>
                  <span className="font-medium text-slate-800">{student.mockTestScore || 'Not Given'}</span>
                </div>

                <div>
                  <span className="text-slate-500 font-semibold block text-[11px]">Target Score:</span>
                  <span className="font-bold text-indigo-700">{student.targetScore || 'Target Max'}</span>
                </div>

                <div>
                  <span className="text-slate-500 font-semibold block text-[11px]">Target Exam Month:</span>
                  <span className="font-medium text-slate-800">{student.targetExamMonth || 'Scheduled'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Section */}
          <div>
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2 mb-3">
              2. Fee Schedule &amp; Financial Breakdown
            </h3>

            <table className="w-full text-xs">
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-2 text-slate-500 font-medium">Standard Course Fee</td>
                  <td className="py-2 text-right text-slate-500 line-through">
                    {currencySymbol} {payment.coursePrice.toLocaleString()}
                  </td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 text-emerald-700 font-medium">Scholarship / Approved Discount ({payment.discountPercent}%)</td>
                  <td className="py-2 text-right font-bold text-emerald-700">
                    -{currencySymbol} {payment.discount.toLocaleString()}
                  </td>
                </tr>
                <tr className="border-b-2 border-slate-900 text-sm font-extrabold">
                  <td className="py-2.5 text-slate-900">Total Agreed Fee</td>
                  <td className="py-2.5 text-right text-slate-900">
                    {currencySymbol} {payment.soldPrice.toLocaleString()}
                  </td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 text-slate-600 font-medium">Amount Received</td>
                  <td className="py-2 text-right font-bold text-emerald-700">
                    {currencySymbol} {payment.amountPaid.toLocaleString()}
                  </td>
                </tr>
                {!isFullPaid && (
                  <tr className="bg-red-50 text-red-900 font-bold">
                    <td className="py-2 px-2">Balance Remaining Due</td>
                    <td className="py-2 px-2 text-right text-sm">
                      {currencySymbol} {payment.dueAmount.toLocaleString()}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {!isFullPaid && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                <strong>Important Due Date Requirement:</strong> Balance payment of <strong>{currencySymbol} {payment.dueAmount.toLocaleString()}</strong> must be cleared on or before <strong>{payment.dueDate}</strong> (strictly within 30 days of enrollment). Batch access will be suspended if unpaid 02 calendar days past due date.
              </div>
            )}
          </div>

          {/* Agreed Terms & Signature */}
          {terms?.termsAccepted && (
            <div>
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2 mb-2">
                3. Agreed Admission Terms &amp; Electronic Signature
              </h3>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div className="flex items-center gap-1.5 text-emerald-700 font-bold mb-1">
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>The parent has read, accepted, and signed all 10 Admission Rules &amp; Terms.</span>
                </div>
                <div>Parent Legal Signature: <strong className="font-serif text-sm">{terms.parentLegalSignature}</strong></div>
                <div className="text-[11px] text-slate-500 mt-0.5">Signature Date: {terms.signedAt}</div>
              </div>
            </div>
          )}

          {/* Counsellor & Support Assignment */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200 text-xs">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">Sales Representative</span>
              <div className="font-bold text-slate-900">{sales?.salesRepresentative}</div>
              <div className="text-slate-600">{sales?.counsellorEmail}</div>
            </div>

            <div className="text-right">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">PW Global Support</span>
              <div className="font-bold text-slate-900">Global Admissions Desk</div>
              <div className="text-slate-600">{booking.supportEmailRecipient}</div>
            </div>
          </div>

          {/* Corporate Footer Note */}
          <div className="pt-4 border-t border-slate-200 text-[10px] text-slate-400 text-center">
            PW Global is a subbrand under PhysicsWallah Limited &bull; Verified Electronic Admission Record
          </div>

        </div>

      </div>
    </div>
  );
}
