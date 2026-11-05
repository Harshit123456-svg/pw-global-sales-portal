import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PW Global - Sales Counsellor Admissions Portal',
  description: 'Official Sales Booking, Student Onboarding, and Automated Admission Dispatch for PhysicsWallah Global',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased font-sans bg-slate-50 text-slate-900 selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
