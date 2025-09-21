
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { Heart, Users, Loader2, UserPlus, Check, X } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, getDoc, query, where, serverTimestamp, Timestamp, writeBatch, orderBy, onSnapshot } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { filterDeletedUsers, logFilteringStats, isUserDeleted } from '@/lib/user-filtering';

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

interface Community {
  id: string;
  name: string;
  description: string;
  logoUrl?: string;
  bannerUrl?: string;
  memberCount: number;
  isPrivate: boolean;
  ownerId: string;
  ownerName: string;
  createdAt: any;
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
  
  // Communities state
  const [communities, setCommunities] = useState<Community[]>([]);
  const [isLoadingCommunities, setIsLoadingCommunities] = useState(true);

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

  // Cancel a sent connection request
  const cancelConnectionRequest = async (targetPerson: SuggestedPerson) => {
    if (!currentUser) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "You must be logged in to cancel connection requests.",
      });
      return;
    }

    setSendingRequests(prev => new Set(prev).add(targetPerson.id));

    try {
      // Find and delete the pending request
      const requestsRef = collection(db, 'connectionRequests');
      const q = query(
        requestsRef,
        where('fromUserId', '==', currentUser.uid),
        where('toUserId', '==', targetPerson.id),
        where('status', '==', 'pending')
      );

      const snapshot = await getDocs(q);
      const batch = writeBatch(db);

      snapshot.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      // Update UI
      setSuggestedPeople(prev =>
        prev.map(person =>
          person.id === targetPerson.id
            ? { ...person, connectionStatus: 'none' as const }
            : person
        )
      );

      toast({
        title: "Request Cancelled",
        description: `Connection request to ${targetPerson.name} has been cancelled.`,
      });
    } catch (error) {
      console.error('Error cancelling connection request:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to cancel connection request. Please try again.",
      });
    } finally {
      setSendingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(targetPerson.id);
        return newSet;
      });
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
        } catch (e) {
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
          
          // Filter out deleted users before processing
          const activeUserDocs = filterDeletedUsers(usersSnapshot.docs);
          logFilteringStats(usersSnapshot.docs.length, activeUserDocs.length, "dashboard");
          
          const allUsers: SuggestedPerson[] = [];

          activeUserDocs.forEach((docSnap) => {
            const data = docSnap.data();
            
            // Double-check for deleted users (extra safety)
            if (isUserDeleted(data)) {
              return; // Skip this user
            }
            
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

  // Fetch communities from Firestore
  useEffect(() => {
    if (!currentUser) {
      setIsLoadingCommunities(false);
      return;
    }

    const fetchCommunities = async () => {
      setIsLoadingCommunities(true);
      try {
        const communitiesRef = collection(db, 'communities');
        const q = query(communitiesRef, orderBy('createdAt', 'desc'));
        
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
          const fetchedCommunities: Community[] = [];
          
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Only show public communities or communities where user is a member
            if (!data.isPrivate || (data.members && data.members.includes(currentUser.uid))) {
              fetchedCommunities.push({
                id: doc.id,
                name: data.name,
                description: data.description,
                logoUrl: data.logoUrl,
                bannerUrl: data.bannerUrl,
                memberCount: data.memberCount || 1,
                isPrivate: data.isPrivate || false,
                ownerId: data.ownerId,
                ownerName: data.ownerName,
                createdAt: data.createdAt,
              });
            }
          });
          
          // Limit to 3 most recent communities for dashboard
          setCommunities(fetchedCommunities.slice(0, 3));
          setIsLoadingCommunities(false);
        });
        
        return unsubscribe;
      } catch (error) {
        console.error('Error fetching communities:', error);
        toast({
          variant: "destructive",
          title: "Error Loading Communities",
          description: "Could not load communities. Please try again later.",
        });
        setIsLoadingCommunities(false);
      }
    };

    fetchCommunities();
  }, [currentUser, toast]);

  const dynamicVibeCommunityImage = currentThemeMode === 'dark' ? '/bannerd.png' : '/bannerl.png';

  const renderConnectionButton = (person: SuggestedPerson) => {
    const isSending = sendingRequests.has(person.id);

    switch (person.connectionStatus) {
      case 'pending':
        // Check if the current user is the one who sent the request
        const isSender = connectionRequests.some(
          req => req.toUserId === person.id && req.status === 'pending' && req.fromUserId === currentUser?.uid
        );

        if (isSender) {
          return (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-auto text-xs border-yellow-500/70 text-yellow-600 hover:bg-yellow-500/10 hover:text-yellow-700"
              onClick={() => cancelConnectionRequest(person)}
              disabled={isSending}
            >
              {isSending ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Cancel Request'
              )}
            </Button>
          );
        }

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
    <div className="h-full overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6 space-y-6 sm:space-y-8 md:space-y-12">
      <section className="px-1 sm:px-2 md:px-4">
        <div className="flex items-center justify-between mb-3 sm:mb-4 md:mb-6">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-primary flex items-center" style={{ textShadow: '0 0 4px hsl(var(--primary)/0.6)' }}>
            <Users className="mr-2 sm:mr-2 md:mr-3 h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-primary" />
            <span className="hidden sm:inline">Tailored Communities</span>
            <span className="sm:hidden">Communities</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          <Card key={vibeCommunityStaticDetails.id} className="bg-card border-border/50 shadow-lg hover:shadow-[0_0_15px_hsl(var(--primary)/0.3)] transition-shadow duration-300 flex flex-col">
            <div className="relative w-full h-28 sm:h-32 md:h-40">
              <Image
                src={dynamicVibeCommunityImage}
                alt={vibeCommunityStaticDetails.name}
                fill
                className="object-cover rounded-t-lg"
                data-ai-hint={vibeCommunityStaticDetails.dataAiHint}
              />
            </div>
            <CardHeader className="pb-2 pt-2.5 sm:pt-3 md:pt-4">
              <CardTitle className="text-base sm:text-lg md:text-xl text-foreground group-hover:text-primary transition-colors">{vibeCommunityStaticDetails.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow text-sm md:text-base">
              <CardDescription className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{vibeCommunityStaticDetails.description}</CardDescription>
              <p className="text-xs text-muted-foreground/80 mt-2">
                {isLoadingMemberCount ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin inline-block mr-1" /> : `${vibeCommunityMemberCount} members`}
              </p>
            </CardContent>
            <div className="p-2.5 sm:p-3 md:p-4 pt-0">
              <button className="w-full py-2 px-2.5 sm:px-3 md:px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md text-xs sm:text-sm font-medium transition-colors" onClick={() => router.push('/communities')}>
                Explore vibe
              </button>
            </div>
          </Card>
        </div>
      </section>

      {/* User Created Communities Section */}
      {communities.length > 0 && (
        <section className="px-1 sm:px-2 md:px-4">
          <div className="flex items-center justify-between mb-3 sm:mb-4 md:mb-6">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-primary flex items-center" style={{ textShadow: '0 0 4px hsl(var(--primary)/0.6)' }}>
              <Users className="mr-2 sm:mr-2 md:mr-3 h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-primary" />
              <span className="hidden sm:inline">Latest Communities</span>
              <span className="sm:hidden">New Communities</span>
            </h2>
            <Button 
              variant="outline" 
              onClick={() => router.push('/discover')} 
              className="text-xs sm:text-sm"
            >
              View All
            </Button>
          </div>
          {isLoadingCommunities ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2 text-muted-foreground text-sm">Loading communities...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
              {communities.map((community) => {
                const communityImage = community.bannerUrl || community.logoUrl || dynamicVibeCommunityImage;
                
                return (
                  <Card key={community.id} className="bg-card border-border/50 shadow-lg hover:shadow-[0_0_15px_hsl(var(--primary)/0.3)] transition-shadow duration-300 flex flex-col">
                    <div className="relative w-full h-28 sm:h-32 md:h-40">
                      <Image
                        src={communityImage}
                        alt={community.name}
                        fill
                        className="object-cover rounded-t-lg"
                        data-ai-hint="community banner"
                        quality={95}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    </div>
                    <CardHeader className="pb-2 pt-2.5 sm:pt-3 md:pt-4">
                      <CardTitle className="text-base sm:text-lg md:text-xl text-foreground group-hover:text-primary transition-colors">{community.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow text-sm md:text-base">
                      <CardDescription className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{community.description}</CardDescription>
                      <p className="text-xs text-muted-foreground/80 mt-2 flex items-center">
                        <Users className="mr-1.5 h-3 w-3" />
                        {community.memberCount} member{community.memberCount !== 1 ? 's' : ''}
                      </p>
                      {community.isPrivate && (
                        <Badge variant="secondary" className="mt-2 text-xs">
                          Private
                        </Badge>
                      )}
                    </CardContent>
                    <div className="p-2.5 sm:p-3 md:p-4 pt-0">
                      <button 
                        className="w-full py-2 px-2.5 sm:px-3 md:px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md text-xs sm:text-sm font-medium transition-colors" 
                        onClick={() => router.push(`/communities?communityId=${community.id}`)}
                      >
                        Join Community
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      )}

      <section className="px-1 sm:px-2 md:px-4">
        <div className="flex items-center justify-between mb-3 sm:mb-4 md:mb-6">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-accent flex items-center" style={{ textShadow: '0 0 4px hsl(var(--accent)/0.6)' }}>
            <Heart className="mr-2 sm:mr-2 md:mr-3 h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-accent" />
            <span className="hidden sm:inline">People with Similar Interests</span>
            <span className="sm:hidden">Similar Interests</span>
          </h2>
        </div>
        {isLoadingPeople ? (
          <div className="flex justify-center items-center py-8 sm:py-10">
            <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-accent" />
            <p className="ml-2 text-muted-foreground text-sm sm:text-base">Loading people...</p>
          </div>
        ) : suggestedPeople.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3 md:gap-4">
            {suggestedPeople.map((person) => (
              <Card key={person.id} className="bg-card border-border/50 shadow-md hover:shadow-[0_0_10px_hsl(var(--accent)/0.25)] transition-shadow duration-300 flex flex-col items-center text-center p-2.5 sm:p-3">
                <Avatar className="h-14 w-14 sm:h-16 sm:w-16 md:h-20 md:w-20 mb-2 border-2 border-accent/50">
                  <AvatarImage src={person.avatar} alt={person.name} data-ai-hint={person.dataAiHint} />
                  <AvatarFallback>{person.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <CardTitle className="text-xs sm:text-sm md:text-base font-semibold text-foreground mb-1 truncate w-full">{person.name}</CardTitle>
                {person.tags.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-0.5 sm:gap-1 mb-2">
                    {person.tags
                      .filter(tag => tag && tag.trim() !== '') // Filter out empty or whitespace tags
                      .slice(0, 2)
                      .map((tag, index) => (
                        <span
                          key={`${person.id}-tag-${index}`} // Combine person ID and index for unique key
                          className="text-xs bg-muted/70 text-muted-foreground px-1 sm:px-1.5 py-0.5 rounded-sm"
                        >
                          {tag}
                        </span>
                      ))
                    }
                  </div>
                )}
                {renderConnectionButton(person)}
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-4 sm:py-6 text-sm sm:text-base">No user suggestions available at the moment. Check back later!</p>
        )}
      </section>
    </div>
  );
}

