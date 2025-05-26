
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Compass, UserPlus, Hash, Globe, Users } from 'lucide-react'; // Added Globe, Users

// Placeholder data - in a real app, this would come from an API
const placeholderPeople = [
  { id: 1, name: "Alex Parker", avatar: "https://placehold.co/150x150.png", dataAiHint: "person smiling", bio: "Loves hiking, indie music, and sci-fi movies. Always up for an adventure!", tags: ["#Hiking", "#IndieMusic", "#SciFi", "#Travel"] },
  { id: 2, name: "Jamie Kai", avatar: "https://placehold.co/150x150.png", dataAiHint: "woman glasses", bio: "Digital artist, coffee enthusiast, and a lover of retro games.", tags: ["#DigitalArt", "#CoffeeLover", "#RetroGaming", "#Creative"] },
  { id: 3, name: "Morgan Lee", avatar: "https://placehold.co/150x150.png", dataAiHint: "man thoughtful", bio: "Software dev by day, aspiring chef by night. Passionate about tech and food.", tags: ["#Coding", "#Foodie", "#Tech", "#Cooking"] },
  { id: 4, name: "Casey Devon", avatar: "https://placehold.co/150x150.png", dataAiHint: "person happy", bio: "Bookworm, cat parent, and a board game aficionado. Exploring new worlds, one page at a time.", tags: ["#Reading", "#BoardGames", "#Cats", "#Fantasy"] },
  { id: 5, name: "Riley Finn", avatar: "https://placehold.co/150x150.png", dataAiHint: "woman outdoors", bio: "Photographer, enjoys urban exploration and documentary filmmaking.", tags: ["#Photography", "#UrbanExplore", "#Documentary", "#Film"] },
  { id: 6, name: "Taylor Sam", avatar: "https://placehold.co/150x150.png", dataAiHint: "man casual", bio: "Musician, guitarist, and songwriter. Looking for collaborators!", tags: ["#Music", "#Guitar", "#Songwriting", "#Band"] },
];

const placeholderCommunities = [
  { id: 1, name: "Photography Enthusiasts", image: "https://placehold.co/300x200.png", dataAiHint: "camera lens", description: "Share your best shots and techniques.", members: 1700 },
  { id: 2, name: "Urban Gardeners", image: "https://placehold.co/300x200.png", dataAiHint: "plants city", description: "Grow food and flowers in city spaces.", members: 950 },
  { id: 3, name: "Board Game Geeks", image: "https://placehold.co/300x200.png", dataAiHint: "dice game", description: "Discuss strategies and find new games.", members: 2200 },
  { id: 4, name: "Sustainable Living", image: "https://placehold.co/300x200.png", dataAiHint: "nature recycle", description: "Tips and tricks for an eco-friendly lifestyle.", members: 1300 },
];

export default function DiscoverPage() {
  return (
    <div className="space-y-12 px-4">
      <section>
        <div className="flex items-center mb-8">
          <Compass className="mr-3 h-9 w-9 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight text-primary" style={{ textShadow: '0 0 5px hsl(var(--primary)/0.6)' }}>
            Discover People
          </h1>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {placeholderPeople.map((person) => (
            <Card key={person.id} className="bg-card border-border/50 shadow-lg hover:shadow-[0_0_15px_hsl(var(--accent)/0.2)] transition-shadow duration-300 flex flex-col">
              <CardHeader className="p-4 items-center text-center">
                <div className="relative w-28 h-28 mx-auto mb-3">
                   <Image 
                      src={person.avatar} 
                      alt={person.name} 
                      fill
                      className="object-cover rounded-full border-2 border-accent/70 shadow-md"
                      data-ai-hint={person.dataAiHint}
                    />
                </div>
                <CardTitle className="text-xl text-foreground group-hover:text-primary transition-colors">{person.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow p-4 pt-0">
                <CardDescription className="text-sm text-muted-foreground line-clamp-3 mb-3">{person.bio}</CardDescription>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {person.tags.slice(0, 3).map(tag => ( // Show up to 3 tags
                    <span key={tag} className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-full flex items-center">
                      <Hash className="mr-1 h-3 w-3"/>{tag.replace('#','')}
                    </span>
                  ))}
                </div>
              </CardContent>
              <div className="p-4 pt-2">
                 <Button variant="outline" className="w-full group border-primary text-primary hover:bg-primary/10 hover:text-primary shadow-[0_0_8px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_10px_hsl(var(--primary)/0.5)] transition-all duration-300" disabled>
                    <UserPlus className="mr-2 h-4 w-4"/> Connect
                 </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center mb-8">
          <Globe className="mr-3 h-9 w-9 text-accent" />
          <h1 className="text-4xl font-bold tracking-tight text-accent" style={{ textShadow: '0 0 5px hsl(var(--accent)/0.6)' }}>
            Explore Communities
          </h1>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {placeholderCommunities.map((community) => (
            <Card key={community.id} className="bg-card border-border/50 shadow-lg hover:shadow-[0_0_15px_hsl(var(--primary)/0.3)] transition-shadow duration-300 flex flex-col">
              <div className="relative w-full h-40">
                <Image 
                  src={community.image} 
                  alt={community.name} 
                  fill
                  className="object-cover rounded-t-lg"
                  data-ai-hint={community.dataAiHint}
                />
              </div>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-xl text-foreground group-hover:text-primary transition-colors">{community.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <CardDescription className="text-sm text-muted-foreground line-clamp-2">{community.description}</CardDescription>
                <p className="text-xs text-muted-foreground/80 mt-2 flex items-center">
                    <Users className="mr-1.5 h-3 w-3" />
                    {community.members.toLocaleString()} members
                </p>
              </CardContent>
              <div className="p-4 pt-0">
                 <Button variant="outline" className="w-full group border-accent text-accent hover:bg-accent/10 hover:text-accent shadow-[0_0_8px_hsl(var(--accent)/0.3)] hover:shadow-[0_0_10px_hsl(var(--accent)/0.5)] transition-all duration-300" disabled>
                    View Community
                 </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
