import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'K-pop Demon Hunter Feed',
  description: 'Fan page aggregator: videos, news, products',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        {children}
      </body>
    </html>
  );
}


