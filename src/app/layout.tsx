import './globals.css';

import type { Metadata } from 'next';
import { Noto_Sans, Noto_Sans_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/shared/components/ui/tooltip';
import { cn } from '@/shared/lib/utils';
import { QueryClientProvider } from '@/shared/providers/query-client.provider';

const notoSans = Noto_Sans({ subsets: ['latin'], variable: '--font-sans' });
const notoSansMono = Noto_Sans_Mono({ subsets: ['latin'], variable: '--font-sans-mono' });

export const metadata: Metadata = {
  title: 'Co W Lesie',
  description: 'Realtime forest events map with community reports and safety alerts.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn('h-full', 'antialiased', 'font-sans', notoSans.variable, notoSansMono.variable)}>
      <body className="flex min-h-full flex-col">
        <QueryClientProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </QueryClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
