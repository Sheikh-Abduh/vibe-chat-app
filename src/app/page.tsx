
"use client";

// Original content commented out for diagnostics:
// import { useEffect } from 'react';
// import { useRouter } from 'next/navigation';
// import SplashScreenDisplay from '@/components/common/splash-screen-display';

// export default function SplashScreenRoute() {
//   const router = useRouter();

//   useEffect(() => {
//     const timer = setTimeout(() => {
//       router.push('/login');
//     }, 3000); // 3 seconds delay

//     return () => clearTimeout(timer);
//   }, [router]);

//   return <SplashScreenDisplay />;
// }

export default function HomePage() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
      <h1>Vibe App</h1>
      <p>If you see this, the basic Next.js server is working.</p>
      <p>The original splash screen page is temporarily simplified for diagnostics.</p>
      <a href="/login" style={{ marginTop: '20px', color: 'hsl(var(--primary))', textDecoration: 'underline' }}>
        Proceed to Login
      </a>
    </div>
  );
}
