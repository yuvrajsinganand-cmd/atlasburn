import type {Metadata} from 'next';
import './globals.css';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { Toaster } from '@/components/ui/toaster';
import { DemoProvider } from '@/components/demo-provider';
import { AuthGuard } from '@/components/auth-guard';

export const metadata: Metadata = {
  title: 'AtlasBurn | AI Capital Risk Engine',
  description: 'Forensic burn modeling and capital risk simulation for AI-native companies.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          <DemoProvider>
            <AuthGuard>
              {children}
              <Toaster />
            </AuthGuard>
          </DemoProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
