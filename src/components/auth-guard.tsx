'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser } from '@/firebase';
import { useDemoMode } from '@/components/demo-provider';
import { Loader2 } from 'lucide-react';

/**
 * Institutional AuthGuard
 * 
 * Enforces a strict authentication boundary:
 * 1. Redirects unauthenticated users to /login unless Demo Mode is active.
 * 2. Redirects authenticated users away from /login to the dashboard.
 * 3. Provides a clean loading state during identity verification.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const { isDemoMode } = useDemoMode();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isUserLoading) {
      const isAuthenticated = !!user || isDemoMode;
      const isLoginPage = pathname === '/login';

      if (!isAuthenticated && !isLoginPage) {
        router.replace('/login');
      } else if (isAuthenticated && isLoginPage) {
        router.replace('/');
      }
    }
  }, [user, isDemoMode, isUserLoading, pathname, router]);

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

  const isAuthenticated = !!user || isDemoMode;
  const isLoginPage = pathname === '/login';

  // Prevent unauthorized layout flicker
  if (!isAuthenticated && !isLoginPage) {
    return null;
  }

  if (isAuthenticated && isLoginPage) {
    return null;
  }

  return <>{children}</>;
}
