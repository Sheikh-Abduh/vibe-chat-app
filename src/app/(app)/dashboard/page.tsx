
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Image from "next/image";
import { Heart, Users, Tv, BookOpenText } from 'lucide-react'; // Example icons

// Placeholder data - in a real app, this would come from an API or state
const placeholderCommunities = [
  { id: 1, name: "Sci-Fi Readers Club", image: "https://placehold.co/300x200.png", dataAiHint: "books futuristic", description: "Discuss your favorite sci-fi novels and authors.", members: 1200 },
  { id: 2, name: "Indie Game Developers", image: "https://placehold.co/300x200.png", dataAiHint: "gaming joystick", description: "Share projects, get feedback, and collaborate.", members: 850 },
  { id: 3, name: "Vintage Movie Buffs", image: "https://placehold.co/300x200.png", dataAiHint: "cinema film", description: "For lovers of classic cinema from the golden age.", members: 600 },
  { id: 4, name: "AI Art Creators", image: "https://placehold.co/300x200.png", dataAiHint: "abstract digital", description: "Explore the frontier of AI-generated art.", members: 2500 },
];

const placeholderPeople = [
  { id: 1, name: "Alex Ray", avatar: "https://placehold.co/100x100.png", dataAiHint: "person portrait", tags: ["#SciFi", "#Gaming", "#Tech"] },
  { id: 2, name: "Jamie Lee", avatar: "https://placehold.co/100x100.png", dataAiHint: "woman smiling", tags: ["#Movies", "#Art", "#Vintage"] },
  { id: 3, name: "Casey Pat", avatar: "https://placehold.co/100x100.png", dataAiHint: "man glasses", tags: ["#AI", "#Coding", "#Design"] },
  { id: 4, name: "Morgan Sky", avatar: "https://placehold.co/100x100.png", dataAiHint: "person happy", tags: ["#Reading", "#Travel", "#Music"] },
];


export default function DashboardPage() {
  // In a real app, you'd fetch user-specific data here based on their interests
  // For now, we use placeholders.

  return (
    <div className="space-y-12 p-6 h-full overflow-y-auto"> {/* Added p-6, h-full and overflow-y-auto */}
      {/* Tailored Communities Section */}
      <section> {/* Removed px-4, handled by parent div */}
        <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold tracking-tight text-primary flex items-center" style={{ textShadow: '0 0 4px hsl(var(--primary)/0.6)'}}>
                <Users className="mr-3 h-8 w-8 text-primary" />
                Tailored Communities
            </h2>
            <a href="#" className="text-sm text-accent hover:text-accent/80 hover:underline">View All</a>
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
                <p className="text-xs text-muted-foreground/80 mt-2">{community.members.toLocaleString()} members</p>
              </CardContent>
              <div className="p-4 pt-0">
                 <button className="w-full py-2 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md text-sm font-medium transition-colors">Join Community</button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* People with Similar Interests Section */}
      <section>  {/* Removed px-4, handled by parent div */}
         <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold tracking-tight text-accent flex items-center" style={{ textShadow: '0 0 4px hsl(var(--accent)/0.6)'}}>
                <Heart className="mr-3 h-8 w-8 text-accent" />
                People with Similar Interests
            </h2>
             <a href="#" className="text-sm text-primary hover:text-primary/80 hover:underline">View All</a>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {placeholderPeople.map((person) => (
            <Card key={person.id} className="bg-card border-border/50 shadow-md hover:shadow-[0_0_15px_hsl(var(--accent)/0.3)] transition-shadow duration-300 text-center p-4">
              <div className="relative w-24 h-24 mx-auto mb-3">
                 <Image
                    src={person.avatar}
                    alt={person.name}
                    fill
                    className="object-cover rounded-full border-2 border-accent/70"
                    data-ai-hint={person.dataAiHint}
                  />
              </div>
              <CardTitle className="text-lg text-foreground mb-1">{person.name}</CardTitle>
              <div className="flex flex-wrap justify-center gap-1">
                {person.tags.map(tag => (
                  <span key={tag} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{tag}</span>
                ))}
              </div>
              <button className="mt-3 w-full py-1.5 px-3 bg-accent hover:bg-accent/90 text-accent-foreground rounded-md text-sm font-medium transition-colors">Connect</button>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

    