import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import './globals.css';

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
    <html lang="es-CO">
      <body className="min-h-screen bg-[#F8F9FA] font-sans text-[#222222] antialiased">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
