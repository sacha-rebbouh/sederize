'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { createClient, clearRememberMeCookies } from '@/lib/supabase/client';

export default function SignOutPage() {
  const router = useRouter();
  const hasStarted = useRef(false);

  useEffect(() => {
    // Prevent double execution
    if (hasStarted.current) return;
    hasStarted.current = true;

    const performSignOut = async () => {
      const supabase = createClient();

      // Clear remember me cookies before signing out
      clearRememberMeCookies();

      // Sign out from Supabase
      await supabase.auth.signOut();

      // Wait 1s for smooth transition
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Redirect to login
      router.push('/login');
      router.refresh();
    };

    performSignOut();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 className="h-8 w-8 text-primary" />
        </motion.div>
        <p className="text-muted-foreground">Signing out...</p>
      </motion.div>
    </div>
  );
}
