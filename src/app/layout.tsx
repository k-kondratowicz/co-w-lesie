import './globals.css';

import type { Metadata, Viewport } from 'next';
import { Noto_Sans, Noto_Sans_Mono } from 'next/font/google';
import { Toaster } from '@/shared/components/ui';
import { TooltipProvider } from '@/shared/components/ui/tooltip';
import { cn } from '@/shared/lib/utils';
import { QueryClientProvider } from '@/shared/providers/query-client.provider';
import { ServiceWorkerRegister } from './service-worker-register';

const notoSans = Noto_Sans({ subsets: ['latin', 'latin-ext'], variable: '--font-sans' });
const notoSansMono = Noto_Sans_Mono({ subsets: ['latin', 'latin-ext'], variable: '--font-sans-mono' });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://co-w-lesie.pl';
const description =
  'Mapa zgłoszeń i bezpieczeństwa w polskich lasach. Sprawdź zagrożenie pożarowe i zakazy wstępu, zanim wejdziesz do lasu.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: 'Co w lesie',
  title: { default: 'Co w lesie', template: '%s · Co w lesie' },
  description,
  appleWebApp: { capable: true, title: 'Co w lesie', statusBarStyle: 'default' },
  openGraph: {
    type: 'website',
    locale: 'pl_PL',
    siteName: 'Co w lesie',
    title: 'Co w lesie',
    description,
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Co w lesie',
    description,
  },
};

export const viewport: Viewport = {
  themeColor: '#00786f',
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
      </body>
    </html>
  );
}
