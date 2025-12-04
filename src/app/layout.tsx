// app/layout.tsx
import './globals.css';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/providers/AuthProvider';

export const metadata = {
  title: 'God Mode Panel',
  description: 'Secure Super Admin Control Interface',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
