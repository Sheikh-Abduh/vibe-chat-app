
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageCircle, 
  UserPlus, 
  Users, 
  Mail, 
  Smartphone, 
  MonitorPlay, 
  ListChecks,
  Volume2,
  VolumeX,
  Search,
  X,
  User as UserIcon,
  Hash,
  AtSign
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import SplashScreenDisplay from '@/components/common/splash-screen-display';

interface NotificationStates {
  [key: string]: boolean;
}

interface NotificationSetting {
  id: string;
  label: string;
  icon: React.ElementType;
  storageKeySuffix: string; 
}

interface MuteSettings {
  mutedUsers: string[];
  mutedConversations: string[];
  mutedCommunities: string[];
  allowMentionsWhenMuted: boolean;
}

interface MutedItem {
  id: string;
  name: string;
  type: 'user' | 'conversation' | 'community';
  mutedAt: Date;
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

interface UserNotificationSettings {
  [key: string]: boolean; 
}

export default function NotificationSettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [notificationStates, setNotificationStates] = useState<NotificationStates>({});
  const [muteSettings, setMuteSettings] = useState<MuteSettings>({
    mutedUsers: [],
    mutedConversations: [],
    mutedCommunities: [],
    allowMentionsWhenMuted: true
  });
  const [mutedItems, setMutedItems] = useState<MutedItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddMute, setShowAddMute] = useState(false);
  const [newMuteType, setNewMuteType] = useState<'user' | 'conversation' | 'community'>('user');
  const [newMuteId, setNewMuteId] = useState('');
  const [newMuteName, setNewMuteName] = useState('');

  const allSettings = [...contentNotificationSettings, ...deliveryMethodSettings];

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
            initialStates[setting.id] = firestoreSettings?.[setting.storageKeySuffix] !== false; 
          });
          
          // Load mute settings
          const firestoreMuteSettings = userDocSnap.data().muteSettings as MuteSettings | undefined;
          if (firestoreMuteSettings) {
            setMuteSettings(firestoreMuteSettings);
            // Convert to MutedItem array for display
            const items: MutedItem[] = [];
            
            firestoreMuteSettings.mutedUsers.forEach(userId => {
              items.push({
                id: userId,
                name: `User ${userId.substring(0, 8)}...`,
                type: 'user',
                mutedAt: new Date()
              });
            });
            
            firestoreMuteSettings.mutedConversations.forEach(convId => {
              items.push({
                id: convId,
                name: `Conversation ${convId.substring(0, 8)}...`,
                type: 'conversation',
                mutedAt: new Date()
              });
            });
            
            firestoreMuteSettings.mutedCommunities.forEach(communityId => {
              items.push({
                id: communityId,
                name: `Community ${communityId.substring(0, 8)}...`,
                type: 'community',
                mutedAt: new Date()
              });
            });
            
            setMutedItems(items);
          }
        } else {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]); 

  const handleToggleChange = async (settingId: string, newCheckedState: boolean, label: string) => {
    if (!currentUser) return;

    const settingDefinition = allSettings.find(s => s.id === settingId);
    if (!settingDefinition) return;

    setNotificationStates(prev => ({ ...prev, [settingId]: newCheckedState }));

    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      let existingNotificationSettings = {};
      if (userDocSnap.exists() && userDocSnap.data().notificationSettings) {
        existingNotificationSettings = userDocSnap.data().notificationSettings;
      }
      
      const updatedSettings = {
        ...existingNotificationSettings,
        [settingDefinition.storageKeySuffix]: newCheckedState
      };

      await setDoc(userDocRef, { 
        notificationSettings: updatedSettings
      }, { merge: true });
      
      toast({
        title: `${label} ${newCheckedState ? 'Enabled' : 'Disabled'}`,
        description: `You will ${newCheckedState ? 'now' : 'no longer'} receive these notifications.`,
      });
    } catch (error) {
      console.error("Error saving notification setting to Firestore:", error);
      toast({ variant: "destructive", title: "Save Failed", description: "Could not save notification preference." });
      setNotificationStates(prev => ({ ...prev, [settingId]: !newCheckedState }));
    }
  };

  const handleMuteToggle = async (allowMentions: boolean) => {
    if (!currentUser) return;

    const updatedMuteSettings = {
      ...muteSettings,
      allowMentionsWhenMuted: allowMentions
    };

    setMuteSettings(updatedMuteSettings);

    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      await setDoc(userDocRef, { 
        muteSettings: updatedMuteSettings
      }, { merge: true });
      
      toast({
        title: `Mentions ${allowMentions ? 'Allowed' : 'Blocked'}`,
        description: allowMentions 
          ? "You will still receive notifications for mentions even when muted." 
          : "You will not receive any notifications from muted sources.",
      });
    } catch (error) {
      console.error("Error saving mute setting to Firestore:", error);
      toast({ variant: "destructive", title: "Save Failed", description: "Could not save mute preference." });
      setMuteSettings(muteSettings); // Revert on error
    }
  };

  const addMutedItem = async () => {
    if (!currentUser || !newMuteId.trim() || !newMuteName.trim()) {
      toast({ variant: "destructive", title: "Invalid Input", description: "Please provide both ID and name." });
      return;
    }

    const updatedMuteSettings = { ...muteSettings };
    const newItem: MutedItem = {
      id: newMuteId.trim(),
      name: newMuteName.trim(),
      type: newMuteType,
      mutedAt: new Date()
    };

    // Add to appropriate array
    switch (newMuteType) {
      case 'user':
        if (!updatedMuteSettings.mutedUsers.includes(newMuteId.trim())) {
          updatedMuteSettings.mutedUsers.push(newMuteId.trim());
        }
        break;
      case 'conversation':
        if (!updatedMuteSettings.mutedConversations.includes(newMuteId.trim())) {
          updatedMuteSettings.mutedConversations.push(newMuteId.trim());
        }
        break;
      case 'community':
        if (!updatedMuteSettings.mutedCommunities.includes(newMuteId.trim())) {
          updatedMuteSettings.mutedCommunities.push(newMuteId.trim());
        }
        break;
    }

    setMuteSettings(updatedMuteSettings);
    setMutedItems(prev => [...prev, newItem]);

    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      await setDoc(userDocRef, { 
        muteSettings: updatedMuteSettings
      }, { merge: true });
      
      toast({
        title: "Item Muted",
        description: `${newMuteName} has been muted.`,
      });

      // Reset form
      setNewMuteId('');
      setNewMuteName('');
      setShowAddMute(false);
    } catch (error) {
      console.error("Error saving mute setting to Firestore:", error);
      toast({ variant: "destructive", title: "Save Failed", description: "Could not save mute preference." });
      // Revert on error
      setMuteSettings(muteSettings);
      setMutedItems(prev => prev.filter(item => item.id !== newMuteId.trim()));
    }
  };

  const removeMutedItem = async (itemId: string, itemType: 'user' | 'conversation' | 'community') => {
    if (!currentUser) return;

    const updatedMuteSettings = { ...muteSettings };

    // Remove from appropriate array
    switch (itemType) {
      case 'user':
        updatedMuteSettings.mutedUsers = updatedMuteSettings.mutedUsers.filter(id => id !== itemId);
        break;
      case 'conversation':
        updatedMuteSettings.mutedConversations = updatedMuteSettings.mutedConversations.filter(id => id !== itemId);
        break;
      case 'community':
        updatedMuteSettings.mutedCommunities = updatedMuteSettings.mutedCommunities.filter(id => id !== itemId);
        break;
    }

    setMuteSettings(updatedMuteSettings);
    setMutedItems(prev => prev.filter(item => item.id !== itemId));

    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      await setDoc(userDocRef, { 
        muteSettings: updatedMuteSettings
      }, { merge: true });
      
      toast({
        title: "Item Unmuted",
        description: "The item has been unmuted.",
      });
    } catch (error) {
      console.error("Error saving mute setting to Firestore:", error);
      toast({ variant: "destructive", title: "Save Failed", description: "Could not save mute preference." });
      // Revert on error
      setMuteSettings(muteSettings);
      setMutedItems(prev => [...prev, {
        id: itemId,
        name: `Item ${itemId.substring(0, 8)}...`,
        type: itemType,
        mutedAt: new Date()
      }]);
    }
  };

  const filteredMutedItems = mutedItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isCheckingAuth || !currentUser) {
    return <SplashScreenDisplay />;
  }

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Notification Settings</h1>
            <p className="text-muted-foreground mt-2">Manage your notification preferences and mute settings.</p>
          </div>
        </div>

        <Card className="w-full bg-card border-border/50 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl text-foreground flex items-center">
                <MessageCircle className="mr-2 h-6 w-6 text-primary" />
                Content Notifications
            </CardTitle>
            <CardDescription className="text-muted-foreground pt-1">
              Choose which types of notifications you want to receive.
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

        <Card className="w-full bg-card border-border/50 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl text-foreground flex items-center">
                <VolumeX className="mr-2 h-6 w-6 text-destructive" />
                Mute Settings
            </CardTitle>
            <CardDescription className="text-muted-foreground pt-1">
              Manage muted users, conversations, and communities. Mentions will still show up unless disabled below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-2">
            {/* Mentions Toggle */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center">
                <AtSign className="mr-3 h-5 w-5 text-muted-foreground" />
                <div>
                  <Label className="text-base text-foreground cursor-pointer">
                    Allow Mentions When Muted
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications for @mentions even from muted sources
                  </p>
                </div>
              </div>
              <Switch
                checked={muteSettings.allowMentionsWhenMuted}
                onCheckedChange={handleMuteToggle}
                aria-label="Toggle mentions when muted"
              />
            </div>

            <Separator className="bg-border/50" />

            {/* Add New Mute */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Muted Items</h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowAddMute(!showAddMute)}
                >
                  {showAddMute ? <X className="h-4 w-4 mr-2" /> : <VolumeX className="h-4 w-4 mr-2" />}
                  {showAddMute ? 'Cancel' : 'Add Mute'}
                </Button>
              </div>

              {showAddMute && (
                <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="mute-type">Type</Label>
                      <select
                        id="mute-type"
                        value={newMuteType}
                        onChange={(e) => setNewMuteType(e.target.value as 'user' | 'conversation' | 'community')}
                        className="w-full p-2 border rounded-md bg-background"
                      >
                        <option value="user">User</option>
                        <option value="conversation">Conversation</option>
                        <option value="community">Community</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="mute-id">ID</Label>
                      <Input
                        id="mute-id"
                        placeholder="Enter ID..."
                        value={newMuteId}
                        onChange={(e) => setNewMuteId(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="mute-name">Name</Label>
                      <Input
                        id="mute-name"
                        placeholder="Enter name..."
                        value={newMuteName}
                        onChange={(e) => setNewMuteName(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button onClick={addMutedItem} className="w-full">
                    Add Mute
                  </Button>
                </div>
              )}

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search muted items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Muted Items List */}
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {filteredMutedItems.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      {searchTerm ? 'No muted items found.' : 'No muted items yet.'}
                    </p>
                  ) : (
                    filteredMutedItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg bg-background">
                                                 <div className="flex items-center space-x-3">
                           {item.type === 'user' && <UserIcon className="h-4 w-4 text-muted-foreground" />}
                           {item.type === 'conversation' && <MessageCircle className="h-4 w-4 text-muted-foreground" />}
                           {item.type === 'community' && <Hash className="h-4 w-4 text-muted-foreground" />}
                          <div>
                            <p className="font-medium text-foreground">{item.name}</p>
                            <p className="text-sm text-muted-foreground">{item.id}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary">
                            {item.type}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMutedItem(item.id, item.type)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

