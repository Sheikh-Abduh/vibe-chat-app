
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Globe, Users, PlusCircle } from 'lucide-react'; 
import { useToast } from "@/hooks/use-toast";

const placeholderCommunities = [
  { id: 1, name: "Photography Enthusiasts", image: "https://placehold.co/300x200.png", dataAiHint: "camera lens", description: "Share your best shots and techniques.", members: 1700 },
  { id: 2, name: "Urban Gardeners", image: "https://placehold.co/300x200.png", dataAiHint: "plants city", description: "Grow food and flowers in city spaces.", members: 950 },
  { id: 3, name: "Board Game Geeks", image: "https://placehold.co/300x200.png", dataAiHint: "dice game", description: "Discuss strategies and find new games.", members: 2200 },
  { id: 4, name: "Sustainable Living", image: "https://placehold.co/300x200.png", dataAiHint: "nature recycle", description: "Tips and tricks for an eco-friendly lifestyle.", members: 1300 },
];

export default function DiscoverPage() {
  const { toast } = useToast();

  const handleMakeCommunity = () => {
    toast({
      title: "Coming Soon!",
      description: "The feature to create your own community is under development.",
    });
  };

  return (
    <div className="space-y-12 px-4">
      <section>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
          <div className="flex items-center mb-4 sm:mb-0">
            <Globe className="mr-3 h-9 w-9 text-primary" />
            <h1 className="text-4xl font-bold tracking-tight text-primary" style={{ textShadow: '0 0 5px hsl(var(--primary)/0.6)' }}>
              Explore Communities
            </h1>
          </div>
          <Button 
            onClick={handleMakeCommunity} 
            variant="outline" 
            className="group border-accent text-accent hover:bg-accent/10 hover:text-accent shadow-[0_0_8px_hsl(var(--accent)/0.4)] hover:shadow-[0_0_12px_hsl(var(--accent)/0.6)] transition-all duration-300 ease-in-out"
          >
            <PlusCircle className="mr-2 h-5 w-5" />
            Make Your Own Community
          </Button>
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
