
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // Import useRouter
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Image from "next/image";
import { Heart, Users, Loader2 } from 'lucide-react';
// import { db } from '@/lib/firebase'; // db import no longer needed for users here
// import { collection, getDocs, limit, query } from 'firebase/firestore'; // Firestore imports no longer needed for users here
import { useToast } from '@/hooks/use-toast';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';

// Details for the "vibe" community, consistent with communities/page.tsx
const vibeCommunityStaticDetails = {
  id: 'vibe-community-main',
  name: 'vibe',
  // image property will be derived dynamically
  dataAiHint: 'abstract colorful logo',
  description: 'The official community for all vibe users. Connect, share, discuss your passions, and discover!',
  membersText: "Many members", // Static text instead of dynamic count
};

interface SuggestedPerson { // This interface can be removed if the feature is fully disabled
  id: string;
  name: string;
  avatar: string;
  dataAiHint: string;
  tags: string[];
}

export default function DashboardPage() {
  const router = useRouter(); // Initialize router
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  // const [suggestedPeople, setSuggestedPeople] = useState<SuggestedPerson[]>([]); // No longer fetching suggested people
  // const [isLoadingPeople, setIsLoadingPeople] = useState(true); // No longer fetching suggested people
  const [currentThemeMode, setCurrentThemeMode] = useState<'light' | 'dark'>('dark');


  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
        setCurrentUser(user);
        if (user && typeof window !== 'undefined') {
            const modeFromStorage = localStorage.getItem(`appSettings_${user.uid}`);
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
        } else if (!user) { // If no user, default to dark or system preference
            setCurrentThemeMode(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        }
    });
    return () => unsubscribe();
  }, []);

  // Removing user fetching logic due to Firestore permission constraints
  // useEffect(() => {
  //   // Fetching users for "suggested people" and member count is removed.
  // }, [toast, currentUser]);

  const dynamicVibeCommunityImage = currentThemeMode === 'dark' ? '/bannerd.png' : '/bannerl.png'; // Using banner as main image here

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden p-4 md:p-6 space-y-8 md:space-y-12">
      {/* Tailored Communities Section */}
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
                {vibeCommunityStaticDetails.membersText}
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

      {/* People with Similar Interests Section */}
      <section className="px-2 sm:px-4">
         <div className="flex items-center justify-between mb-4 md:mb-6">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-accent flex items-center" style={{ textShadow: '0 0 4px hsl(var(--accent)/0.6)'}}>
                <Heart className="mr-2 md:mr-3 h-7 w-7 md:h-8 md:w-8 text-accent" />
                People with Similar Interests
            </h2>
        </div>
        {/*isLoadingPeople ? ( // This section is removed as user listing is not possible with current rules
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="ml-2 text-muted-foreground">Loading people...</p>
          </div>
        ) : suggestedPeople.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
            {suggestedPeople.map((person) => (
              // ... card rendering removed ...
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-6">No user suggestions available at the moment. Check back later!</p>
        )*/}
        <p className="text-center text-muted-foreground py-6">
            User suggestions are currently unavailable. Check back later!
            <br />
            <span className="text-xs italic">(Note: Listing users requires different permission settings.)</span>
        </p>
      </section>
    </div>
  );
}
