
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <section className="px-4">
        <div className="flex items-center mb-6">
          <Settings className="mr-3 h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight text-primary" style={{ textShadow: '0 0 4px hsl(var(--primary)/0.6)' }}>
            Settings
          </h1>
        </div>
        <Card className="bg-card border-border/50 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl text-foreground">Application Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This is the main settings page. More options will be available here in the future.
            </p>
            <p className="text-muted-foreground mt-4">
              You can edit your profile details by navigating to your avatar dropdown and clicking &quot;Edit Profile&quot;, or by directly going to the profile settings page.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
