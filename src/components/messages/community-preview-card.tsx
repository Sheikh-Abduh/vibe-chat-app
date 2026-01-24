"use client";

import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Users } from 'lucide-react';

interface CommunityPreviewCardProps {
    communityId: string;
    communityName: string;
    communityIcon?: string;
    communityBanner?: string;
    communityDescription?: string;
}

export function CommunityPreviewCard({
    communityId,
    communityName,
    communityIcon,
    communityBanner,
    communityDescription,
}: CommunityPreviewCardProps) {
    const router = useRouter();

    const handleClick = () => {
        router.push(`/community/${communityId}`);
    };

    return (
        <Card
            className="overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-lg bg-white/5 backdrop-blur-md border border-white/10 max-w-md"
            onClick={handleClick}
        >
            {/* Banner Image */}
            {communityBanner && (
                <div className="relative w-full h-32 bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                    <Image
                        src={communityBanner}
                        alt={`${communityName} banner`}
                        fill
                        className="object-cover"
                    />
                </div>
            )}

            {/* Content */}
            <div className="p-4">
                <div className="flex items-start gap-3">
                    {/* Community Icon */}
                    <div className="relative flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-white/10">
                        {communityIcon ? (
                            <Image
                                src={communityIcon}
                                alt={`${communityName} icon`}
                                fill
                                className="object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <Users className="w-6 h-6 text-purple-400" />
                            </div>
                        )}
                    </div>

                    {/* Community Info */}
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white text-base mb-1 truncate">
                            {communityName}
                        </h3>
                        {communityDescription && (
                            <p className="text-sm text-gray-400 line-clamp-2">
                                {communityDescription}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );
}
