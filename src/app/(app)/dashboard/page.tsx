
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Image from "next/image";
import { Heart, Users, Tv, BookOpenText, Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { User as FirebaseUser } from 'firebase/auth'; // To avoid conflict with other User types
import { auth } from '@/lib/firebase';

// Details for the "vibe" community, consistent with communities/page.tsx
const vibeCommunityDetails = {
  id: 'vibe-community-main',
  name: 'vibe',
  image: 'https://placehold.co/300x200.png',
  dataAiHint: 'abstract colorful logo',
  description: 'The official community for all vibe users. Connect, share, discuss your passions, and discover!',
  members: 0, // This will be dynamically updated or can be a placeholder like "Many"
};

interface SuggestedPerson {
  id: string;
  name: string;
  avatar: string;
  dataAiHint: string;
  tags: string[];
}

export default function DashboardPage() {
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [suggestedPeople, setSuggestedPeople] = useState<SuggestedPerson[]>([]);
  const [isLoadingPeople, setIsLoadingPeople] = useState(true);
  const [isLoadingCommunityMembers, setIsLoadingCommunityMembers] = useState(true);
  const [vibeCommunityMemberCount, setVibeCommunityMemberCount] = useState(0);


  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
        setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoadingPeople(true);
      try {
        const usersCollectionRef = collection(db, 'users');
        // Fetch a small number of users for the "People with Similar Interests" section
        const q = query(usersCollectionRef, limit(6));
        const querySnapshot = await getDocs(q);
        const fetchedPeople: SuggestedPerson[] = querySnapshot.docs
          .filter(docSnap => currentUser ? docSnap.id !== currentUser.uid : true) // Exclude current user
          .slice(0, 4) // Take up to 4 other users
          .map(docSnap => {
            const userData = docSnap.data();
            const profile = userData.profileDetails || {};
            const userTags: string[] = [];
            if (profile.passion && profile.passion !== "Not set") userTags.push(`#${profile.passion.replace(/_/g, '').replace(/\s&?\s/g, '')}`);
            if (profile.hobbies && profile.hobbies !== "Not set") {
              profile.hobbies.split(',').slice(0, 2).forEach((hobby: string) => userTags.push(`#${hobby.trim().replace(/\s+/g, '')}`));
            }
            return {
              id: docSnap.id,
              name: profile.displayName || userData.email?.split('@')[0] || 'User',
              avatar: profile.photoURL || `https://placehold.co/100x100.png?text=${(profile.displayName || 'U').charAt(0).toUpperCase()}`,
              dataAiHint: 'person face',
              tags: userTags.slice(0, 3), // Max 3 tags
            };
          });
        setSuggestedPeople(fetchedPeople);
      } catch (error) {
        console.error("Error fetching suggested people:", error);
        toast({
          variant: "destructive",
          title: "Error Loading People",
          description: "Could not load user suggestions.",
        });
      } finally {
        setIsLoadingPeople(false);
      }
    };

     const fetchCommunityMemberCount = async () => {
      setIsLoadingCommunityMembers(true);
      try {
        const usersCollectionRef = collection(db, 'users');
        const querySnapshot = await getDocs(usersCollectionRef);
        setVibeCommunityMemberCount(querySnapshot.size);
      } catch (error) {
        console.error("Error fetching community member count:", error);
        // Not showing a toast for this as it's a background count
      } finally {
        setIsLoadingCommunityMembers(false);
      }
    };
    
    if (currentUser) { // Only fetch if a user is logged in, to allow excluding self
        fetchUsers();
    } else { // If no user, fetch without filtering (though dashboard isn't typically seen by non-logged-in users)
        fetchUsers(); 
    }
    fetchCommunityMemberCount();

  }, [toast, currentUser]);


  return (
    <div className="h-full overflow-y-auto overflow-x-hidden p-4 md:p-6 space-y-8 md:space-y-12">
      {/* Tailored Communities Section */}
      <section className="px-2 sm:px-4">
        <div className="flex items-center justify-between mb-4 md:mb-6">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-primary flex items-center" style={{ textShadow: '0 0 4px hsl(var(--primary)/0.6)'}}>
                <Users className="mr-2 md:mr-3 h-7 w-7 md:h-8 md:w-8 text-primary" />
                Tailored Communities
            </h2>
            {/* <a href="#" className="text-sm text-accent hover:text-accent/80 hover:underline">View All</a> */}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          <Card key={vibeCommunityDetails.id} className="bg-card border-border/50 shadow-lg hover:shadow-[0_0_15px_hsl(var(--primary)/0.3)] transition-shadow duration-300 flex flex-col">
            <div className="relative w-full h-32 sm:h-40">
              <Image
                src={vibeCommunityDetails.image}
                alt={vibeCommunityDetails.name}
                fill
                className="object-cover rounded-t-lg"
                data-ai-hint={vibeCommunityDetails.dataAiHint}
              />
            </div>
            <CardHeader className="pb-2 pt-3 sm:pt-4">
              <CardTitle className="text-lg sm:text-xl text-foreground group-hover:text-primary transition-colors">{vibeCommunityDetails.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow text-sm sm:text-base">
              <CardDescription className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{vibeCommunityDetails.description}</CardDescription>
              <p className="text-xs text-muted-foreground/80 mt-2">
                {isLoadingCommunityMembers ? <Loader2 className="h-3 w-3 animate-spin inline mr-1"/> : vibeCommunityMemberCount.toLocaleString()} members
              </p>
            </CardContent>
            <div className="p-3 sm:p-4 pt-0">
                <button className="w-full py-2 px-3 sm:px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md text-xs sm:text-sm font-medium transition-colors" onClick={() => toast({ title: "Coming Soon!", description: "Joining communities functionality will be implemented."})}>
                  Explore vibe
                </button>
            </div>
          </Card>
        </div>
      </section>

      {/* People with Similar Interests Section */}
      <section className="px-2 sm:px-4">
         <div className="flex items-center justify-between mb-4 md:mb-6">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-accent flex items-center" style={{ textShadow: '0 0 4px hsl(var(--accent)/0.6)'}}>
                <Heart className="mr-2 md:mr-3 h-7 w-7 md:h-8 md:w-8 text-accent" />
                People with Similar Interests
            </h2>
             {/* <a href="#" className="text-sm text-primary hover:text-primary/80 hover:underline">View All</a> */}
        </div>
        {isLoadingPeople ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="ml-2 text-muted-foreground">Loading people...</p>
          </div>
        ) : suggestedPeople.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
            {suggestedPeople.map((person) => (
              <Card key={person.id} className="bg-card border-border/50 shadow-md hover:shadow-[0_0_15px_hsl(var(--accent)/0.3)] transition-shadow duration-300 text-center p-3 sm:p-4">
                <div className="relative w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-2 sm:mb-3">
                   <Image
                      src={person.avatar}
                      alt={person.name}
                      fill
                      className="object-cover rounded-full border-2 border-accent/70"
                      data-ai-hint={person.dataAiHint}
                    />
                </div>
                <CardTitle className="text-base sm:text-lg text-foreground mb-1 truncate">{person.name}</CardTitle>
                <div className="flex flex-wrap justify-center gap-1 text-xs sm:text-sm min-h-[20px]">
                  {person.tags.map(tag => (
                    <span key={tag} className="text-xs bg-muted text-muted-foreground px-1.5 sm:px-2 py-0.5 rounded-full">{tag}</span>
                  ))}
                </div>
                <button className="mt-2 sm:mt-3 w-full py-1.5 px-2 sm:px-3 bg-accent hover:bg-accent/90 text-accent-foreground rounded-md text-xs sm:text-sm font-medium transition-colors" onClick={() => toast({ title: "Coming Soon!", description: "Connect with users functionality will be implemented."})}>
                    Connect
                </button>
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

