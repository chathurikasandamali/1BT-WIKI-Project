// Root layout — replaced from Next.js scaffold.
// Imports globals.css from src/app/ (which has Tailwind directives + Inter font).
// Shell layout (Sidebar + Navbar) is in src/app/(dashboard)/layout.tsx.
import type { Metadata } from 'next';
import './globals.css';

import { BRAND_FULL_NAME } from '@/lib/constants/brand';

export const metadata: Metadata = {
  title: BRAND_FULL_NAME,
  description: '1Billion Technology Internal Knowledge Base',
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({
  children,
}: RootLayoutProps): React.JSX.Element {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-brand-bg">{children}</body>
    </html>
  );
}
