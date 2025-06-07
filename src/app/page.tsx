
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SplashScreenDisplay from '@/components/common/splash-screen-display';

export default function SplashScreenRoute() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/login');
    }, 3000); // 3 seconds delay

    return () => clearTimeout(timer);
  }, [router]);

  return <SplashScreenDisplay />;
}

