
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-8 px-4">
      <section>
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
              Welcome to the main settings area for your vibe account. Here, you'll be able to manage application-wide preferences in the future.
            </p>
            <p className="text-muted-foreground mt-4">
              Currently, most customizable options relate to your personal profile.
            </p>
            <p className="text-muted-foreground mt-2">
              To edit your "About Me", status, hobbies, age, gender, tags, or passion, please use the "Edit Profile" option available in the user dropdown menu (click your avatar in the bottom-left sidebar).
            </p>
            {/* Future settings sections can be added below */}
            {/* 
            <div className="mt-6 pt-6 border-t border-border/30">
              <h3 className="text-lg font-medium text-foreground mb-2">Notification Preferences</h3>
              <p className="text-sm text-muted-foreground">Manage your notification settings here (coming soon).</p>
            </div>
            <div className="mt-6 pt-6 border-t border-border/30">
              <h3 className="text-lg font-medium text-foreground mb-2">Account Management</h3>
              <p className="text-sm text-muted-foreground">Manage account deletion or data export (coming soon).</p>
            </div>
            */}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
