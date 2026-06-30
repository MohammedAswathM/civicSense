import type { Metadata, Viewport } from 'next';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import './globals.css';

export const metadata: Metadata = {
  title: 'CivicSense — See it. Report it. Verify it. Fix it.',
  description:
    'The civic issue reporting platform with AI-powered fraud detection and anonymous reporting. Built for Coimbatore citizens.',
  manifest: '/manifest.json',
  metadataBase: new URL('https://civicsense.app'),
  openGraph: {
    title: 'CivicSense',
    description: 'Report civic issues anonymously. Track resolution in real-time.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#1A56DB',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
