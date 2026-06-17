import './globals.css';

import type { Metadata, Viewport } from 'next';
import { Noto_Sans, Noto_Sans_Mono } from 'next/font/google';
import { AnalyticsConsent } from '@/shared/components/analytics-consent';
import { ConsentBanner } from '@/shared/components/consent-banner';
import { Toaster } from '@/shared/components/ui';
import { TooltipProvider } from '@/shared/components/ui/tooltip';
import { SITE_BRAND_COLOR, SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from '@/shared/lib/site';
import { cn } from '@/shared/lib/utils';
import { QueryClientProvider } from '@/shared/providers/query-client.provider';
import { ServiceWorkerRegister } from './service-worker-register';

const notoSans = Noto_Sans({ subsets: ['latin', 'latin-ext'], variable: '--font-sans' });
const notoSansMono = Noto_Sans_Mono({ subsets: ['latin', 'latin-ext'], variable: '--font-sans-mono' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_TITLE,
  title: { default: SITE_TITLE, template: `%s · ${SITE_TITLE}` },
  description: SITE_DESCRIPTION,
  alternates: { canonical: '/' },
  appleWebApp: { capable: true, title: SITE_TITLE, statusBarStyle: 'default' },
  openGraph: {
    type: 'website',
    locale: 'pl_PL',
    siteName: SITE_TITLE,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ?? '',
  },
};

export const viewport: Viewport = {
  themeColor: SITE_BRAND_COLOR,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" className={cn('h-full', 'antialiased', 'font-sans', notoSans.variable, notoSansMono.variable)}>
      <body className="flex min-h-full flex-col">
        <QueryClientProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </QueryClientProvider>
        <Toaster />
        <ServiceWorkerRegister />
        <ConsentBanner />
        <AnalyticsConsent />
      </body>
    </html>
  );
}
