import type { Metadata } from 'next';
import { Cormorant_Garamond, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const fontSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700', '800'],
});

const fontSerif = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-serif',
  weight: ['500', '600', '700'],
});

const fontMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '600'],
});

export const metadata: Metadata = {
  title: "Escuela Profesional D' Belleza (EPB) | Suite Administrativa & Biométrica",
  description:
    'Plataforma operativa y administrativa de lujo para academia de belleza: control biométrico USB, agendas por salón, multas de $40.000 COP, preventas protegidas (3 días / 24h) y POS con escáner.',
  icons: {
    icon: '/epb-logo.jpg',
    apple: '/epb-logo.jpg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es-CO"
      className={`${fontSans.variable} ${fontSerif.variable} ${fontMono.variable}`}
    >
      <body className="min-h-screen bg-[#F8F9FA] font-sans text-[#222222] antialiased">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
