
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Bell, ArrowLeft, Mail, UserPlus, MessageCircle, Users, Smartphone, MonitorPlay, ListChecks } from 'lucide-react';
import { auth, db } from '@/lib/firebase'; // Ensure db is imported
import { doc, getDoc, setDoc } from 'firebase/firestore'; // Firestore imports
import { onAuthStateChanged, type User } from 'firebase/auth';
import SplashScreenDisplay from '@/components/common/splash-screen-display';
import { useToast } from '@/hooks/use-toast';

interface NotificationSetting {
  id: string;
  label: string;
  icon: React.ElementType;
  storageKeySuffix: string; // Suffix for Firestore field name
}

const contentNotificationSettings: NotificationSetting[] = [
  { id: 'messages', label: 'Direct Messages', icon: MessageCircle, storageKeySuffix: 'messages_enabled' },
  { id: 'friendRequests', label: 'Friend Requests', icon: UserPlus, storageKeySuffix: 'friendRequests_enabled' },
  { id: 'messageRequests', label: 'Message Requests', icon: MessageCircle, storageKeySuffix: 'messageRequests_enabled' },
  { id: 'communityInvites', label: 'Community Invites', icon: Users, storageKeySuffix: 'communityInvites_enabled' },
];

const deliveryMethodSettings: NotificationSetting[] = [
  { id: 'email', label: 'Email Notifications', icon: Mail, storageKeySuffix: 'delivery_email_enabled' },
  { id: 'push', label: 'Push Notifications', icon: Smartphone, storageKeySuffix: 'delivery_push_enabled' },
  { id: 'inApp', label: 'In-App Banners', icon: MonitorPlay, storageKeySuffix: 'delivery_inApp_enabled' },
  { id: 'notificationCentre', label: 'Notification Centre Updates', icon: ListChecks, storageKeySuffix: 'delivery_notificationCentre_enabled' },
];

type NotificationStates = Record<string, boolean>; // Stores setting.id -> boolean

interface UserNotificationSettings {
  [key: string]: boolean; // e.g., messages_enabled: true
}

export default function NotificationSettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [notificationStates, setNotificationStates] = useState<NotificationStates>({});

  const allSettings = [...contentNotificationSettings, ...deliveryMethodSettings];

  // Load settings from Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        const initialStates: NotificationStates = {};

        if (userDocSnap.exists()) {
          const firestoreSettings = userDocSnap.data().notificationSettings as UserNotificationSettings | undefined;
          allSettings.forEach(setting => {
            // Default to true if not found in Firestore or specifically true
            initialStates[setting.id] = firestoreSettings?.[setting.storageKeySuffix] !== false; 
          });
        } else {
          // If no settings doc, default all to true
          allSettings.forEach(setting => {
            initialStates[setting.id] = true;
          });
        }
        setNotificationStates(initialStates);
        setIsCheckingAuth(false);
      } else {
        router.replace('/login');
      }
    });
    return () => unsubscribe();
  }, [router, allSettings]); // allSettings is stable

  const handleToggleChange = async (settingId: string, newCheckedState: boolean, label: string) => {
    if (!currentUser) return;

    const settingDefinition = allSettings.find(s => s.id === settingId);
    if (!settingDefinition) return;

    setNotificationStates(prev => ({ ...prev, [settingId]: newCheckedState }));

    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      // Save to Firestore under notificationSettings.{storageKeySuffix}
      await setDoc(userDocRef, { 
        notificationSettings: {
          [settingDefinition.storageKeySuffix]: newCheckedState 
        }
      }, { merge: true });
      
      toast({
        title: `${label} ${newCheckedState ? 'Enabled' : 'Disabled'}`,
        description: `You will ${newCheckedState ? 'now' : 'no longer'} receive these notifications.`,
      });
    } catch (error) {
      console.error("Error saving notification setting to Firestore:", error);
      toast({ variant: "destructive", title: "Save Failed", description: "Could not save notification preference." });
      // Revert optimistic UI update on error
      setNotificationStates(prev => ({ ...prev, [settingId]: !newCheckedState }));
    }
  };

  if (isCheckingAuth || !currentUser) {
    return <SplashScreenDisplay />;
  }

  return (
    <div className="h-full overflow-y-auto p-6">
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
