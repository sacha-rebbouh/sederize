'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      // Handle OAuth error from provider
      if (errorParam) {
        console.error('OAuth error:', errorParam, errorDescription);
        router.push(`/login?error=${encodeURIComponent(errorDescription || errorParam)}`);
        return;
      }

      // Handle missing code
      if (!code) {
        console.error('Auth callback: missing code parameter');
        router.push('/login?error=' + encodeURIComponent('Authentication failed'));
        return;
      }

      try {
        const supabase = createClient();
        const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

        if (sessionError) {
          console.error('Session exchange error:', sessionError.message);
          setError(sessionError.message);
          router.push(`/login?error=${encodeURIComponent(sessionError.message)}`);
          return;
        }

        // Success - redirect to home
        router.push('/');
      } catch (err) {
        console.error('Auth callback error:', err);
        setError('Authentication failed');
        router.push('/login?error=' + encodeURIComponent('Authentication failed'));
      }
    };

    handleCallback();
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive">{error}</p>
          <p className="text-muted-foreground mt-2">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="mt-4 text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}
