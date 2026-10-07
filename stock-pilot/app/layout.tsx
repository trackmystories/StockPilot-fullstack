import '@mantine/core/styles.css';
import './globals.css';

import { MantineProvider } from '@mantine/core';

import { NavigationHeader } from './components/NavigationHeader';
import { Footer } from './components/Footer';

export const metadata = {
  title: 'StockPilot',
  description: 'Stock research and investment insights',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <MantineProvider>
          <NavigationHeader />

          <main>{children}</main>
          <Footer />
        </MantineProvider>
      </body>
    </html>
  );
}