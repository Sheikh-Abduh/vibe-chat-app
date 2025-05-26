
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Compass, UserPlus, Hash } from 'lucide-react'; // Example icons

// Placeholder data - in a real app, this would come from an API
const placeholderPeople = [
  { id: 1, name: "Alex Parker", avatar: "https://placehold.co/150x150.png", dataAiHint: "person smiling", bio: "Loves hiking, indie music, and sci-fi movies. Always up for an adventure!", tags: ["#Hiking", "#IndieMusic", "#SciFi", "#Travel"] },
  { id: 2, name: "Jamie Kai", avatar: "https://placehold.co/150x150.png", dataAiHint: "woman glasses", bio: "Digital artist, coffee enthusiast, and a lover of retro games.", tags: ["#DigitalArt", "#CoffeeLover", "#RetroGaming", "#Creative"] },
  { id: 3, name: "Morgan Lee", avatar: "https://placehold.co/150x150.png", dataAiHint: "man thoughtful", bio: "Software dev by day, aspiring chef by night. Passionate about tech and food.", tags: ["#Coding", "#Foodie", "#Tech", "#Cooking"] },
  { id: 4, name: "Casey Devon", avatar: "https://placehold.co/150x150.png", dataAiHint: "person happy", bio: "Bookworm, cat parent, and a board game aficionado. Exploring new worlds, one page at a time.", tags: ["#Reading", "#BoardGames", "#Cats", "#Fantasy"] },
  { id: 5, name: "Riley Finn", avatar: "https://placehold.co/150x150.png", dataAiHint: "woman outdoors", bio: "Photographer, enjoys urban exploration and documentary filmmaking.", tags: ["#Photography", "#UrbanExplore", "#Documentary", "#Film"] },
  { id: 6, name: "Taylor Sam", avatar: "https://placehold.co/150x150.png", dataAiHint: "man casual", bio: "Musician, guitarist, and songwriter. Looking for collaborators!", tags: ["#Music", "#Guitar", "#Songwriting", "#Band"] },
];

export default function DiscoverPage() {
  return (
    <div className="space-y-8 px-4">
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
    </div>
  );
}
