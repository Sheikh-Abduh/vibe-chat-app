
"use client";

import React from 'react'; // Added this line
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Bell, ArrowLeft, Mail, UserPlus, MessageCircle, Users, Smartphone, MonitorPlay, ListChecks } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import SplashScreenDisplay from '@/components/common/splash-screen-display';
import { useToast } from '@/hooks/use-toast';

interface NotificationSetting {
  id: string;
  label: string;
  icon: React.ElementType;
  storageKeySuffix: string;
}

const contentNotificationSettings: NotificationSetting[] = [
  { id: 'messages', label: 'Direct Messages', icon: MessageCircle, storageKeySuffix: 'messages_enabled' },
  { id: 'friendRequests', label: 'Friend Requests', icon: UserPlus, storageKeySuffix: 'friendRequests_enabled' },
  { id: 'messageRequests', label: 'Message Requests', icon: MessageCircle, storageKeySuffix: 'messageRequests_enabled' }, // Consider a different icon if needed
  { id: 'communityInvites', label: 'Community Invites', icon: Users, storageKeySuffix: 'communityInvites_enabled' },
];

const deliveryMethodSettings: NotificationSetting[] = [
  { id: 'email', label: 'Email Notifications', icon: Mail, storageKeySuffix: 'delivery_email_enabled' },
  { id: 'push', label: 'Push Notifications', icon: Smartphone, storageKeySuffix: 'delivery_push_enabled' },
  { id: 'inApp', label: 'In-App Banners', icon: MonitorPlay, storageKeySuffix: 'delivery_inApp_enabled' },
  { id: 'notificationCentre', label: 'Notification Centre Updates', icon: ListChecks, storageKeySuffix: 'delivery_notificationCentre_enabled' },
];

type NotificationStates = Record<string, boolean>;

export default function NotificationSettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [notificationStates, setNotificationStates] = useState<NotificationStates>({});

  const getStorageKey = useCallback((suffix: string) => {
    if (!currentUser) return null;
    return `notifications_${suffix}_${currentUser.uid}`;
  }, [currentUser]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        router.replace('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (currentUser) {
      const initialStates: NotificationStates = {};
      const allSettings = [...contentNotificationSettings, ...deliveryMethodSettings];
      allSettings.forEach(setting => {
        const key = getStorageKey(setting.storageKeySuffix);
        if (key) {
          const storedValue = localStorage.getItem(key);
          initialStates[setting.id] = storedValue === 'true'; // Default to true if not found or explicitly true
        } else {
           initialStates[setting.id] = true; // Default if no user yet (should be rare)
        }
      });
      setNotificationStates(initialStates);
      setIsCheckingAuth(false);
    }
  }, [currentUser, getStorageKey]);

  const handleToggleChange = (settingId: string, newCheckedState: boolean, label: string) => {
    if (!currentUser) return;

    const settingDefinition = [...contentNotificationSettings, ...deliveryMethodSettings].find(s => s.id === settingId);
    if (!settingDefinition) return;

    const key = getStorageKey(settingDefinition.storageKeySuffix);
    if (key) {
      localStorage.setItem(key, newCheckedState.toString());
      setNotificationStates(prev => ({ ...prev, [settingId]: newCheckedState }));
      toast({
        title: `${label} ${newCheckedState ? 'Enabled' : 'Disabled'}`,
        description: `You will ${newCheckedState ? 'now' : 'no longer'} receive these notifications.`,
      });
    }
  };

  if (isCheckingAuth || !currentUser) {
    return <SplashScreenDisplay />;
  }

  return (
    <div className="px-4 pb-8">
      <div className="flex items-center my-6">
        <Button variant="ghost" size="icon" className="mr-2 hover:bg-accent/10" onClick={() => router.push('/settings')}>
            <ArrowLeft className="h-5 w-5 text-accent" />
        </Button>
        <Bell className="mr-3 h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight text-primary" style={{ textShadow: '0 0 4px hsl(var(--primary)/0.6)' }}>
          Notification Settings
        </h1>
      </div>

      <div className="space-y-8">
        <Card className="w-full bg-card border-border/50 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl text-foreground flex items-center">
              <ListChecks className="mr-2 h-6 w-6 text-accent" />
              Notification Content Types
            </CardTitle>
            <CardDescription className="text-muted-foreground pt-1">
              Choose what type of content you want to be notified about.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {contentNotificationSettings.map((setting, index) => (
              <React.Fragment key={setting.id}>
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center">
                    <setting.icon className="mr-3 h-5 w-5 text-muted-foreground" />
                    <Label htmlFor={setting.id} className="text-base text-foreground cursor-pointer">
                      {setting.label}
                    </Label>
                  </div>
                  <Switch
                    id={setting.id}
                    checked={notificationStates[setting.id] || false}
                    onCheckedChange={(checked) => handleToggleChange(setting.id, checked, setting.label)}
                    aria-label={`Toggle ${setting.label} notifications`}
                  />
                </div>
                {index < contentNotificationSettings.length - 1 && <Separator className="bg-border/50" />}
              </React.Fragment>
            ))}
          </CardContent>
        </Card>

        <Card className="w-full bg-card border-border/50 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl text-foreground flex items-center">
                <Smartphone className="mr-2 h-6 w-6 text-accent" />
                Delivery Methods
            </CardTitle>
            <CardDescription className="text-muted-foreground pt-1">
              Choose how you want to receive your notifications.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {deliveryMethodSettings.map((setting, index) => (
              <React.Fragment key={setting.id}>
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center">
                     <setting.icon className="mr-3 h-5 w-5 text-muted-foreground" />
                    <Label htmlFor={setting.id} className="text-base text-foreground cursor-pointer">
                      {setting.label}
                    </Label>
                  </div>
                  <Switch
                    id={setting.id}
                    checked={notificationStates[setting.id] || false}
                    onCheckedChange={(checked) => handleToggleChange(setting.id, checked, setting.label)}
                    aria-label={`Toggle ${setting.label}`}
                  />
                </div>
                {index < deliveryMethodSettings.length - 1 && <Separator className="bg-border/50" />}
              </React.Fragment>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
