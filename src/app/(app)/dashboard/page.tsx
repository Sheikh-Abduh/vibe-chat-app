
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; 
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Image from "next/image";
import { Heart, Users, Loader2, UserPlus, Check, X } from 'lucide-react';
import { db } from '@/lib/firebase'; 
import { collection, getDocs, doc, setDoc, getDoc, query, where, serverTimestamp, Timestamp } from 'firebase/firestore'; 
import { useToast } from '@/hooks/use-toast';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

const vibeCommunityStaticDetails = {
  id: 'vibe-community-main',
  name: 'vibe',
  dataAiHint: 'abstract colorful logo',
  description: 'The official community for all vibe users. Connect, share, discuss your passions, and discover!',
};

interface SuggestedPerson { 
  id: string;
  name: string;
  avatar: string;
  dataAiHint: string;
  tags: string[];
  connectionStatus?: 'none' | 'pending' | 'connected';
}

interface ConnectionRequest {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserAvatar?: string;
  toUserId: string;
  toUserName: string;
  status: 'pending' | 'accepted' | 'rejected';
  timestamp: Date;
}

export default function DashboardPage() {
  const router = useRouter(); 
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [suggestedPeople, setSuggestedPeople] = useState<SuggestedPerson[]>([]);
  const [isLoadingPeople, setIsLoadingPeople] = useState(true);
  const [currentThemeMode, setCurrentThemeMode] = useState<'light' | 'dark'>('dark');
  const [vibeCommunityMemberCount, setVibeCommunityMemberCount] = useState(0);
  const [isLoadingMemberCount, setIsLoadingMemberCount] = useState(true);
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>([]);
  const [sendingRequests, setSendingRequests] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
        setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Check if user has already sent a connection request today
  const hasSentRequestToday = async (targetUserId: string): Promise<boolean> => {
    if (!currentUser) return false;
    
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const requestsRef = collection(db, 'connectionRequests');
      const q = query(
        requestsRef,
        where('fromUserId', '==', currentUser.uid),
        where('toUserId', '==', targetUserId),
        where('timestamp', '>=', Timestamp.fromDate(today))
      );
      
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      console.error('Error checking connection requests:', error);
      return false;
    }
  };

  // Send connection request
  const sendConnectionRequest = async (targetPerson: SuggestedPerson) => {
    if (!currentUser) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "You must be logged in to send connection requests.",
      });
      return;
    }

    // Check if already sent request today
    const alreadySent = await hasSentRequestToday(targetPerson.id);
    if (alreadySent) {
      toast({
        variant: "destructive",
        title: "Request Already Sent",
        description: "You can only send one connection request per person per day.",
      });
      return;
    }

    setSendingRequests(prev => new Set(prev).add(targetPerson.id));

    try {
      const requestData = {
        fromUserId: currentUser.uid,
        fromUserName: currentUser.displayName || currentUser.email?.split('@')[0] || "User",
        fromUserAvatar: currentUser.photoURL || null,
        toUserId: targetPerson.id,
        toUserName: targetPerson.name,
        status: 'pending' as const,
        timestamp: serverTimestamp(),
      };

      // Add to connection requests collection
      const requestsRef = collection(db, 'connectionRequests');
      const requestDocRef = doc(requestsRef);
      await setDoc(requestDocRef, requestData);

      // Create activity notification for the target user
      const targetUserActivityRef = collection(db, `users/${targetPerson.id}/activityItems`);
      await setDoc(doc(targetUserActivityRef), {
        type: 'connection_request',
        actorId: currentUser.uid,
        actorName: currentUser.displayName || currentUser.email?.split('@')[0] || "User",
        actorAvatarUrl: currentUser.photoURL || null,
        contentSnippet: `sent you a connection request`,
        timestamp: serverTimestamp(),
        isRead: false,
        targetUserId: currentUser.uid,
        requestId: requestDocRef.id,
      });

      // Update local state
      setSuggestedPeople(prev => 
        prev.map(person => 
          person.id === targetPerson.id 
            ? { ...person, connectionStatus: 'pending' as const }
            : person
        )
      );

      toast({
        title: "Connection Request Sent!",
        description: `Your connection request has been sent to ${targetPerson.name}.`,
      });

    } catch (error) {
      console.error('Error sending connection request:', error);
      toast({
        variant: "destructive",
        title: "Request Failed",
        description: "Could not send connection request. Please try again.",
      });
    } finally {
      setSendingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(targetPerson.id);
        return newSet;
      });
    }
  };

  // Load connection status for suggested people
  const loadConnectionStatus = async (people: SuggestedPerson[]) => {
    if (!currentUser) return people;

    try {
      const requestsRef = collection(db, 'connectionRequests');
      const q = query(
        requestsRef,
        where('fromUserId', '==', currentUser.uid)
      );
      
      const snapshot = await getDocs(q);
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ConnectionRequest[];

      return people.map(person => {
        const request = requests.find(req => req.toUserId === person.id);
        if (request) {
          const status = request.status === 'accepted' ? 'connected' : request.status;
          return { ...person, connectionStatus: status as 'pending' | 'connected' };
        }
        return { ...person, connectionStatus: 'none' as const };
      });
    } catch (error) {
      console.error('Error loading connection status:', error);
      return people;
    }
  };

  useEffect(() => {
    if (currentUser) {
        const modeFromStorage = localStorage.getItem(`appSettings_${currentUser.uid}`);
        if (modeFromStorage) {
            try {
                const settings = JSON.parse(modeFromStorage);
                setCurrentThemeMode(settings.themeMode || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
            } catch(e) {
                console.error("Error parsing theme from localStorage on dashboard", e);
                setCurrentThemeMode(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
            }
        } else {
             setCurrentThemeMode(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        }

        const fetchUsers = async () => {
          setIsLoadingPeople(true);
          setIsLoadingMemberCount(true);
          try {
            console.log("Dashboard: Current user for fetching users:", auth.currentUser?.uid);
            const usersCollectionRef = collection(db, "users");
            const usersSnapshot = await getDocs(usersCollectionRef);
            const allUsers: SuggestedPerson[] = [];
            
            usersSnapshot.forEach((docSnap) => {
              const data = docSnap.data();
              const profile = data.profileDetails || {};
              const person: SuggestedPerson = {
                id: docSnap.id,
                name: profile.displayName || data.email?.split('@')[0] || "User",
                avatar: profile.photoURL || `https://placehold.co/100x100.png?text=${(profile.displayName || 'U').charAt(0)}`,
                dataAiHint: "person face",
                tags: [profile.passion, profile.hobbies?.split(',')[0]].filter(Boolean).map(tag => tag.trim()),
              };
              allUsers.push(person);
            });

            setVibeCommunityMemberCount(allUsers.length);
            
            const samplePeople = allUsers
              .filter(person => person.id !== currentUser?.uid)
              .sort(() => 0.5 - Math.random()) 
              .slice(0, 4); 
            
            // Load connection status for suggested people
            const peopleWithStatus = await loadConnectionStatus(samplePeople);
            setSuggestedPeople(peopleWithStatus);

          } catch (error) {
            console.error("Dashboard: Error loading users (full error object):", error);
            toast({
              variant: "destructive",
              title: "Error Loading Users",
              description: "Could not load user suggestions or member count. Please ensure you are authenticated and check Firestore security rules in the Firebase Console. See browser console for more details.",
            });
            setSuggestedPeople([]);
            setVibeCommunityMemberCount(0);
          } finally {
            setIsLoadingPeople(false);
            setIsLoadingMemberCount(false);
          }
        };

        fetchUsers();
    }
  }, [currentUser, toast]);

  const dynamicVibeCommunityImage = currentThemeMode === 'dark' ? '/bannerd.png' : '/bannerl.png';

  const renderConnectionButton = (person: SuggestedPerson) => {
    const isSending = sendingRequests.has(person.id);
    
    switch (person.connectionStatus) {
      case 'pending':
        return (
          <Button variant="outline" size="sm" className="w-full mt-auto text-xs border-yellow-500/70 text-yellow-600 hover:bg-yellow-500/10" disabled>
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Pending
          </Button>
        );
      case 'connected':
        return (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full mt-auto text-xs border-green-500/70 text-green-600 hover:bg-green-500/10 hover:bg-green-500/20"
            onClick={() => {
              // Navigate to messages with the connected user
              const userIds = [currentUser?.uid, person.id].sort();
              const conversationId = `${userIds[0]}_${userIds[1]}`;
              router.push(`/messages?conversation=${conversationId}`);
            }}
          >
            <Check className="h-3 w-3 mr-1" />
            Message
          </Button>
        );
      default:
        return (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full mt-auto text-xs border-accent/70 text-accent hover:bg-accent/10 hover:text-accent"
            onClick={() => sendConnectionRequest(person)}
            disabled={isSending}
          >
            {isSending ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <UserPlus className="h-3 w-3 mr-1" />
                Connect
              </>
            )}
          </Button>
        );
    }
  };

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden p-4 md:p-6 space-y-8 md:space-y-12">
      <section className="px-2 sm:px-4">
        <div className="flex items-center justify-between mb-4 md:mb-6">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-primary flex items-center" style={{ textShadow: '0 0 4px hsl(var(--primary)/0.6)'}}>
                <Users className="mr-2 md:mr-3 h-7 w-7 md:h-8 md:w-8 text-primary" />
                Tailored Communities
            </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          <Card key={vibeCommunityStaticDetails.id} className="bg-card border-border/50 shadow-lg hover:shadow-[0_0_15px_hsl(var(--primary)/0.3)] transition-shadow duration-300 flex flex-col">
            <div className="relative w-full h-32 sm:h-40">
              <Image
                src={dynamicVibeCommunityImage}
                alt={vibeCommunityStaticDetails.name}
                fill
                className="object-cover rounded-t-lg"
                data-ai-hint={vibeCommunityStaticDetails.dataAiHint}
              />
            </div>
            <CardHeader className="pb-2 pt-3 sm:pt-4">
              <CardTitle className="text-lg sm:text-xl text-foreground group-hover:text-primary transition-colors">{vibeCommunityStaticDetails.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow text-sm sm:text-base">
              <CardDescription className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{vibeCommunityStaticDetails.description}</CardDescription>
              <p className="text-xs text-muted-foreground/80 mt-2">
                {isLoadingMemberCount ? <Loader2 className="h-4 w-4 animate-spin inline-block mr-1"/> : `${vibeCommunityMemberCount} members`}
              </p>
            </CardContent>
            <div className="p-3 sm:p-4 pt-0">
                <button className="w-full py-2 px-3 sm:px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md text-xs sm:text-sm font-medium transition-colors" onClick={() => router.push('/communities')}>
                  Explore vibe
                </button>
            </div>
          </Card>
        </div>
      </section>

      <section className="px-2 sm:px-4">
         <div className="flex items-center justify-between mb-4 md:mb-6">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-accent flex items-center" style={{ textShadow: '0 0 4px hsl(var(--accent)/0.6)'}}>
                <Heart className="mr-2 md:mr-3 h-7 w-7 md:h-8 md:w-8 text-accent" />
                People with Similar Interests
            </h2>
        </div>
        {isLoadingPeople ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="ml-2 text-muted-foreground">Loading people...</p>
          </div>
        ) : suggestedPeople.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
            {suggestedPeople.map((person) => (
              <Card key={person.id} className="bg-card border-border/50 shadow-md hover:shadow-[0_0_10px_hsl(var(--accent)/0.25)] transition-shadow duration-300 flex flex-col items-center text-center p-3">
                <Avatar className="h-16 w-16 sm:h-20 sm:w-20 mb-2 border-2 border-accent/50">
                  <AvatarImage src={person.avatar} alt={person.name} data-ai-hint={person.dataAiHint} />
                  <AvatarFallback>{person.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <CardTitle className="text-sm sm:text-base font-semibold text-foreground mb-1 truncate w-full">{person.name}</CardTitle>
                {person.tags.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-1 mb-2">
                    {person.tags.slice(0, 2).map(tag => (
                      <span key={tag} className="text-xs bg-muted/70 text-muted-foreground px-1.5 py-0.5 rounded-sm">{tag}</span>
                    ))}
                  </div>
                )}
                {renderConnectionButton(person)}
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-6">No user suggestions available at the moment. Check back later!</p>
        )}
      </section>
    </div>
  );
}

