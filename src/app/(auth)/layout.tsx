export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex items-center justify-center min-h-screen bg-background p-4 selection:bg-primary/30 selection:text-primary-foreground">
      {children}
    </main>
  );
}
