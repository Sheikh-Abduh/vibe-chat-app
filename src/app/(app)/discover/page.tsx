
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Globe, Users, PlusCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

// Updated to reflect the single 'vibe' community structure
const placeholderCommunities = [
  { 
    id: 'vibe-community-main', 
    name: 'vibe', 
    image: 'https://placehold.co/300x200.png', // Same as community icon/banner for consistency
    dataAiHint: 'abstract colorful logo', 
    description: 'The official community for all vibe users. Connect, share, discuss your passions, and discover!', 
    members: 0 // Placeholder, ideally dynamically fetched
  },
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
    <div className="h-full overflow-y-auto overflow-x-hidden p-4 md:p-6 space-y-8 md:space-y-12">
      <section>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 md:mb-8">
          <div className="flex items-center mb-4 sm:mb-0">
            <Globe className="mr-2 md:mr-3 h-7 w-7 md:h-9 md:w-9 text-primary" />
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-primary" style={{ textShadow: '0 0 5px hsl(var(--primary)/0.6)' }}>
              Explore Communities
            </h1>
          </div>
          <Button
            onClick={handleMakeCommunity}
            variant="outline"
            className="group border-accent text-accent hover:bg-accent/10 hover:text-accent shadow-[0_0_8px_hsl(var(--accent)/0.4)] hover:shadow-[0_0_12px_hsl(var(--accent)/0.6)] transition-all duration-300 ease-in-out text-sm md:text-base py-2 px-3 md:px-4"
          >
            <PlusCircle className="mr-2 h-4 w-4 md:h-5 md:w-5" />
            Make Your Own Community
          </Button>
        </div>

        {placeholderCommunities.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {placeholderCommunities.map((community) => (
              <Card key={community.id} className="bg-card border-border/50 shadow-lg hover:shadow-[0_0_15px_hsl(var(--primary)/0.3)] transition-shadow duration-300 flex flex-col">
                <div className="relative w-full h-32 sm:h-40">
                  <Image
                    src={community.image}
                    alt={community.name}
                    fill
                    className="object-cover rounded-t-lg"
                    data-ai-hint={community.dataAiHint}
                  />
                </div>
                <CardHeader className="pb-2 pt-3 sm:pt-4">
                  <CardTitle className="text-lg sm:text-xl text-foreground group-hover:text-primary transition-colors">{community.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow text-sm sm:text-base">
                  <CardDescription className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{community.description}</CardDescription>
                  <p className="text-xs text-muted-foreground/80 mt-2 flex items-center">
                      <Users className="mr-1.5 h-3 w-3" />
                      {/* In a real app, member count would be dynamic */}
                      {(community.members > 0 ? community.members.toLocaleString() : 'Many enthusiastic')} members
                  </p>
                </CardContent>
                <div className="p-3 sm:p-4 pt-0">
                   <Button variant="outline" className="w-full group border-accent text-accent hover:bg-accent/10 hover:text-accent shadow-[0_0_8px_hsl(var(--accent)/0.3)] hover:shadow-[0_0_10px_hsl(var(--accent)/0.5)] transition-all duration-300 text-xs sm:text-sm" disabled>
                      View Community (Coming Soon)
                   </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-10">
            <p>No other communities to discover right now. Why not make one?</p>
          </div>
        )}
      </section>
    </div>
  );
}

    