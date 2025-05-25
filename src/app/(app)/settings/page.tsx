
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Palette, UserCircle, Bell, Link2, Cog, ChevronRight } from "lucide-react";
import Link from "next/link";

interface SettingsCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  href?: string;
  actionText?: string;
}

const settingsCategories: SettingsCategory[] = [
  {
    id: "appearance",
    title: "Appearance",
    description: "Customize your app's look and feel, theme, and accent colors.",
    icon: Palette,
    href: "/settings/appearance",
    actionText: "Customize Appearance",
  },
  {
    id: "profile",
    title: "Profile",
    description: "Manage your personal information, hobbies, interests, and public presence.",
    icon: UserCircle,
    href: "/settings/profile",
    actionText: "Edit Profile",
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "Configure how and when you receive notifications from the app.",
    icon: Bell,
    href: "/settings/notifications",
    actionText: "Manage Notifications",
  },
  {
    id: "integrations",
    title: "Integrations",
    description: "Connect or disconnect third-party apps and services.",
    icon: Link2,
    href: "/settings/integrations",
    actionText: "Manage Integrations",
  },
  {
    id: "advanced",
    title: "Advanced",
    description: "Manage advanced settings like account deletion or data export.",
    icon: Cog,
    // href: "/settings/advanced",
    // actionText: "Advanced Settings",
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-8 px-4">
      <section>
        <div className="flex items-center mb-8">
          <Settings className="mr-3 h-9 w-9 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight text-primary" style={{ textShadow: '0 0 5px hsl(var(--primary)/0.6)' }}>
            Settings
          </h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {settingsCategories.map((category) => (
            <Card key={category.id} className="bg-card border-border/50 shadow-lg hover:shadow-[0_0_15px_hsl(var(--accent)/0.2)] transition-shadow duration-300 flex flex-col">
              <CardHeader className="flex flex-row items-center space-x-4 pb-4">
                <category.icon className="h-8 w-8 text-accent" />
                <CardTitle className="text-2xl text-foreground">{category.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <CardDescription className="text-sm text-muted-foreground line-clamp-3">
                  {category.description}
                </CardDescription>
              </CardContent>
              <div className="p-4 pt-2">
                {category.href ? (
                  <Button variant="outline" className="w-full group border-accent text-accent hover:bg-accent/10 hover:text-accent shadow-[0_0_8px_hsl(var(--accent)/0.3)] hover:shadow-[0_0_10px_hsl(var(--accent)/0.5)] transition-all duration-300" asChild>
                    <Link href={category.href}>
                      {category.actionText || `Go to ${category.title}`}
                      <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                ) : (
                  <Button variant="outline" className="w-full" disabled>
                    {category.actionText || `Manage ${category.title}`} (soon)
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
