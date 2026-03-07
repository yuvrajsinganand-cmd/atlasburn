'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser } from '@/firebase';
import { Loader2 } from 'lucide-react';

/**
 * Institutional AuthGuard
 * 
 * Enforces a strict authentication boundary:
 * 1. Redirects unauthenticated users to /login.
 * 2. Redirects authenticated users away from /login to the dashboard.
 * 3. Provides a clean loading state during identity verification.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isUserLoading) {
      if (!user && pathname !== '/login') {
        router.replace('/login');
      } else if (user && pathname === '/login') {
        router.replace('/');
      }
    }
  }, [user, isUserLoading, pathname, router]);

  if (isUserLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-primary" size={48} />
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground animate-pulse">
            Verifying Institutional Identity...
          </p>
        </div>
      </div>
    );
  }

  // Prevent unauthorized layout flicker
  const isLoginPage = pathname === '/login';
  if (!user && !isLoginPage) {
    return null;
  }

  if (user && isLoginPage) {
    return null;
  }

  return <>{children}</>;
}
