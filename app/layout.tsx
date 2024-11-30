'use client'

import "./globals.css";
import { SDKProvider } from "@telegram-apps/sdk-react";
import { AuthProvider } from '@/providers/AuthProvider';
import { PrivyProvider } from '@/providers/PrivyProvider';


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`antialiased`}
      >
        <SDKProvider acceptCustomStyles debug>
          <AuthProvider>
            <PrivyProvider>
              {children}
            </PrivyProvider>
          </AuthProvider>
        </SDKProvider>
      </body>
    </html>
  );
}
