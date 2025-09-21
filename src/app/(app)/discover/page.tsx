
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { Globe, Users, PlusCircle, Upload, ImageIcon, X, CheckCircle, AlertCircle, Loader2, Settings, Shield, Crown, UserCheck } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { auth, db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, setDoc, getDocs, query, orderBy, onSnapshot } from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';


// Updated to reflect the single 'vibe' community structure
const vibeCommunityStaticDetails = { 
    id: 'vibe-community-main', 
    name: 'vibe', 
    dataAiHint: 'abstract colorful logo', 
    description: 'The official community for all vibe users. Connect, share, discuss your passions, and discover!', 
    membersText: "Many enthusiastic members" // Using static text
  };

// Community creation types and schemas
interface CommunityPermissions {
  canInviteMembers: boolean;
  canCreateChannels: boolean;
  canDeleteMessages: boolean;
  canMentionEveryone: boolean;
  canManageRoles: boolean;
  canKickMembers: boolean;
  canBanMembers: boolean;
  canManageServer: boolean;
}

interface CommunityFormData {
  name: string;
  description: string;
  isPrivate: boolean;
  logoFile?: File;
  bannerFile?: File;
  memberPermissions: CommunityPermissions;
  moderatorPermissions: CommunityPermissions;
  adminPermissions: CommunityPermissions;
}

const communitySchema = z.object({
  name: z.string().min(3, "Community name must be at least 3 characters").max(50, "Community name cannot exceed 50 characters"),
  description: z.string().min(10, "Description must be at least 10 characters").max(500, "Description cannot exceed 500 characters"),
  isPrivate: z.boolean().default(false),
});

type CommunitySchemaValues = z.infer<typeof communitySchema>;

// Default permission sets
const defaultPermissions = {
  member: {
    canInviteMembers: false,
    canCreateChannels: false,
    canDeleteMessages: false,
    canMentionEveryone: false,
    canManageRoles: false,
    canKickMembers: false,
    canBanMembers: false,
    canManageServer: false,
  },
  moderator: {
    canInviteMembers: true,
    canCreateChannels: true,
    canDeleteMessages: true,
    canMentionEveryone: true,
    canManageRoles: false,
    canKickMembers: true,
    canBanMembers: false,
    canManageServer: false,
  },
  admin: {
    canInviteMembers: true,
    canCreateChannels: true,
    canDeleteMessages: true,
    canMentionEveryone: true,
    canManageRoles: true,
    canKickMembers: true,
    canBanMembers: true,
    canManageServer: true,
  },
  owner: {
    canInviteMembers: true,
    canCreateChannels: true,
    canDeleteMessages: true,
    canMentionEveryone: true,
    canManageRoles: true,
    canKickMembers: true,
    canBanMembers: true,
    canManageServer: true,
  }
};

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

export default function DiscoverPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [currentThemeMode, setCurrentThemeMode] = useState<'light' | 'dark'>('dark');
  
  // Communities state
  const [communities, setCommunities] = useState<Community[]>([]);
  const [isLoadingCommunities, setIsLoadingCommunities] = useState(true);
  
  // Community creation dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  
  // Permission states
  const [memberPermissions, setMemberPermissions] = useState<CommunityPermissions>(defaultPermissions.member);
  const [moderatorPermissions, setModeratorPermissions] = useState<CommunityPermissions>(defaultPermissions.moderator);
  const [adminPermissions, setAdminPermissions] = useState<CommunityPermissions>(defaultPermissions.admin);
  
  // Form management
  const form = useForm<CommunitySchemaValues>({
    resolver: zodResolver(communitySchema),
    defaultValues: {
      name: '',
      description: '',
      isPrivate: false,
    },
  });
  
  const totalSteps = 4;

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
        setCurrentUser(user); // Keep track of user for consistency, though not directly used for theme here yet
        if (user && typeof window !== 'undefined') {
            const modeFromStorage = localStorage.getItem(`appSettings_${user.uid}`);
            if (modeFromStorage) {
                 try {
                    const settings = JSON.parse(modeFromStorage);
                    setCurrentThemeMode(settings.themeMode || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
                } catch(e) {
                    console.error("Error parsing theme from localStorage on discover", e);
                    setCurrentThemeMode(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                }
            } else {
                 setCurrentThemeMode(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
            }
        } else if (!user) {
            setCurrentThemeMode(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        }
    });
    return () => unsubscribe();
  }, []);

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
          
          setCommunities(fetchedCommunities);
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


  const handleMakeCommunity = () => {
    if (!currentUser) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please sign in to create a community.",
      });
      return;
    }
    setIsCreateDialogOpen(true);
  };
  
  // File upload handlers
  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          variant: "destructive",
          title: "File Too Large",
          description: "Logo file must be smaller than 5MB.",
        });
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        toast({
          variant: "destructive",
          title: "Invalid File Type",
          description: "Please select an image file for the logo.",
        });
        return;
      }
      
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setLogoPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };
  
  const handleBannerUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          variant: "destructive",
          title: "File Too Large",
          description: "Banner file must be smaller than 10MB.",
        });
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        toast({
          variant: "destructive",
          title: "Invalid File Type",
          description: "Please select an image file for the banner.",
        });
        return;
      }
      
      setBannerFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setBannerPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };
  
  // Permission handlers
  const updatePermission = (
    role: 'member' | 'moderator' | 'admin',
    permission: keyof CommunityPermissions,
    value: boolean
  ) => {
    if (role === 'member') {
      setMemberPermissions(prev => ({ ...prev, [permission]: value }));
    } else if (role === 'moderator') {
      setModeratorPermissions(prev => ({ ...prev, [permission]: value }));
    } else if (role === 'admin') {
      setAdminPermissions(prev => ({ ...prev, [permission]: value }));
    }
  };
  
  // Upload file to Cloudinary with retry logic and compression
  const uploadToCloudinary = async (file: File, type: 'logo' | 'banner', retries = 3): Promise<string | null> => {
    const maxFileSize = type === 'logo' ? 2 * 1024 * 1024 : 5 * 1024 * 1024; // 2MB for logo, 5MB for banner
    
    // Compress file if it's too large
    let processedFile = file;
    if (file.size > maxFileSize) {
      try {
        processedFile = await compressImage(file, maxFileSize);
      } catch (error) {
        console.warn('Failed to compress image, using original:', error);
      }
    }
    
    const formData = new FormData();
    formData.append('file', processedFile);
    formData.append('upload_preset', 'vibe_app'); // Use existing preset
    formData.append('folder', `communities/${type}s`);
    formData.append('resource_type', 'image');
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout
      
      try {
        const response = await fetch(
          'https://api.cloudinary.com/v1_1/dxqfnat7w/image/upload',
          {
            method: 'POST',
            body: formData,
            signal: controller.signal,
          }
        );
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Cloudinary upload error (${response.status}):`, errorText);
          
          if (response.status >= 500 && attempt < retries) {
            // Server error, retry
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            continue;
          }
          
          throw new Error(`Upload failed with status ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        return data.secure_url;
        
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (controller.signal.aborted) {
          if (attempt < retries) {
            console.warn(`Upload attempt ${attempt} timed out, retrying...`);
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
            continue;
          }
          console.warn(`Upload timed out after ${retries} attempts. Community will be created without ${type}.`);
          return null;
        }
        
        if (attempt === retries) {
          console.error(`Error uploading ${type} to Cloudinary (final attempt):`, error);
          
          // Provide specific error feedback
          if (error instanceof TypeError && error.message === 'Failed to fetch') {
            console.warn(`Network error uploading ${type}. Community will be created without ${type}.`);
          } else {
            console.warn(`Cloudinary upload failed for ${type}. Community will be created without ${type}.`);
          }
          
          // Return null instead of throwing to allow community creation to continue
          return null;
        }
        
        // Wait before retry
        console.warn(`Upload attempt ${attempt} failed, retrying...`, error);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    
    return null;
  };
  
  // Compress image helper function
  const compressImage = async (file: File, maxSize: number): Promise<File> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions maintaining aspect ratio
        const maxDimension = 1920;
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxDimension) {
            height = (height * maxDimension) / width;
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = (width * maxDimension) / height;
            height = maxDimension;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          0.8 // 80% quality
        );
      };
      
      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.src = URL.createObjectURL(file);
    });
  };
  
  // Convert file to base64 as emergency fallback (for local storage)
  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.onerror = error => reject(error);
    });
  };
  
  // Create community
  const handleCreateCommunity = async () => {
    if (!currentUser) return;
    
    const formData = form.getValues();
    if (!form.formState.isValid) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill in all required fields correctly.",
      });
      return;
    }
    
    setIsCreating(true);
    
    try {
      let logoUrl = '';
      let bannerUrl = '';
      let uploadWarnings: string[] = [];
      
      // Show upload progress if files are being uploaded
      const uploadTasks = [];
      if (logoFile) uploadTasks.push('logo');
      if (bannerFile) uploadTasks.push('banner');
      
      if (uploadTasks.length > 0) {
        toast({
          title: "Uploading Images",
          description: `Uploading ${uploadTasks.join(' and ')}. This may take a moment...`,
        });
      }
      
      // Handle uploads in parallel with better error handling
      const uploadPromises = [];
      
      if (logoFile) {
        uploadPromises.push(
          uploadToCloudinary(logoFile, 'logo')
            .then(result => {
              if (result) {
                logoUrl = result;
              } else {
                uploadWarnings.push('logo upload failed');
                // Store file locally for potential future upload
                try {
                  convertToBase64(logoFile).then(() => {
                    console.log('Logo stored locally as fallback');
                  }).catch(base64Error => {
                    console.warn('Failed to create local backup of logo:', base64Error);
                  });
                } catch (error) {
                  console.warn('Logo backup failed:', error);
                }
              }
            })
            .catch(logoError => {
              console.error('Logo upload failed:', logoError);
              uploadWarnings.push('logo upload failed');
            })
        );
      }
      
      if (bannerFile) {
        uploadPromises.push(
          uploadToCloudinary(bannerFile, 'banner')
            .then(result => {
              if (result) {
                bannerUrl = result;
              } else {
                uploadWarnings.push('banner upload failed');
                // Store file locally for potential future upload
                try {
                  convertToBase64(bannerFile).then(() => {
                    console.log('Banner stored locally as fallback');
                  }).catch(base64Error => {
                    console.warn('Failed to create local backup of banner:', base64Error);
                  });
                } catch (error) {
                  console.warn('Banner backup failed:', error);
                }
              }
            })
            .catch(bannerError => {
              console.error('Banner upload failed:', bannerError);
              uploadWarnings.push('banner upload failed');
            })
        );
      }
      
      // Wait for all uploads to complete
      if (uploadPromises.length > 0) {
        await Promise.allSettled(uploadPromises);
      }
      
      // Create community document (proceed even if image uploads failed)
      const communityData = {
        name: formData.name,
        description: formData.description,
        isPrivate: formData.isPrivate,
        logoUrl,
        bannerUrl,
        ownerId: currentUser.uid,
        ownerName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
        memberCount: 1, // Only the owner initially
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        permissions: {
          member: memberPermissions,
          moderator: moderatorPermissions,
          admin: adminPermissions,
          owner: defaultPermissions.owner,
        },
        members: [], // No members initially, only owner
        moderators: [],
        admins: [],
        tags: [],
        channels: [], // Will be populated with default channels
      };
      
      // Add to Firestore
      const communityRef = await addDoc(collection(db, 'communities'), communityData);
      
      // Create default channels
      const defaultChannels = [
        { name: 'general', description: 'General discussion', type: 'text' },
        { name: 'announcements', description: 'Important announcements', type: 'text' },
      ];
      
      for (const channel of defaultChannels) {
        await addDoc(collection(db, `communities/${communityRef.id}/channels`), {
          ...channel,
          createdAt: serverTimestamp(),
          createdBy: currentUser.uid,
        });
      }
      
      // Provide success feedback with appropriate warnings
      if (uploadWarnings.length > 0) {
        toast({
          title: "Community Created!",
          description: `${formData.name} has been successfully created. Note: ${uploadWarnings.join(' and ')} - you can add images later in community settings.`,
        });
      } else {
        toast({
          title: "Community Created!",
          description: `${formData.name} has been successfully created.`,
        });
      }
      
      // Reset form and close dialog
      setIsCreateDialogOpen(false);
      setCurrentStep(1);
      form.reset();
      setLogoFile(null);
      setBannerFile(null);
      setLogoPreview(null);
      setBannerPreview(null);
      setMemberPermissions(defaultPermissions.member);
      setModeratorPermissions(defaultPermissions.moderator);
      setAdminPermissions(defaultPermissions.admin);
      
      // Optionally redirect to the new community
      router.push('/communities');
      
    } catch (error) {
      console.error('Error creating community:', error);
      
      toast({
        variant: "destructive",
        title: "Failed to Create Community",
        description: error instanceof Error ? error.message : "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsCreating(false);
    }
  };
  
  const dynamicVibeCommunityImage = currentThemeMode === 'dark' ? '/bannerd.png' : '/bannerl.png'; // Using banner as main image

  const displayCommunity = {
    ...vibeCommunityStaticDetails,
    image: dynamicVibeCommunityImage, // Set dynamically
  };

  // Combine static vibe community with user-created communities
  const staticVibeCommunity = {
    ...displayCommunity,
    memberCount: 0,
    isPrivate: false,
    ownerId: 'vibe-official',
    ownerName: 'Vibe Team',
    members: [],
    moderators: [],
    admins: [],
    createdAt: null,
    tags: [],
    logoUrl: undefined,
    bannerUrl: undefined,
  };
  
  const allCommunities = [staticVibeCommunity, ...communities];

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

        {isLoadingCommunities ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2 text-muted-foreground">Loading communities...</span>
          </div>
        ) : allCommunities.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {allCommunities.map((community, index) => {
              const isVibeCommuity = index === 0; // First item is always vibe community
              const communityImage = isVibeCommuity 
                ? displayCommunity.image 
                : (community.bannerUrl || community.logoUrl || dynamicVibeCommunityImage);
              
              return (
                <Card key={community.id} className="bg-card border-border/50 shadow-lg hover:shadow-[0_0_15px_hsl(var(--primary)/0.3)] transition-shadow duration-300 flex flex-col">
                  <div className="relative w-full h-32 sm:h-40">
                    <Image
                      src={communityImage}
                      alt={community.name}
                      fill
                      className="object-cover rounded-t-lg"
                      data-ai-hint={isVibeCommuity ? displayCommunity.dataAiHint : 'community banner'}
                      quality={95}
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                    />
                  </div>
                  <CardHeader className="pb-2 pt-3 sm:pt-4">
                    <CardTitle className="text-lg sm:text-xl text-foreground group-hover:text-primary transition-colors">{community.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow text-sm sm:text-base">
                    <CardDescription className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{community.description}</CardDescription>
                    <p className="text-xs text-muted-foreground/80 mt-2 flex items-center">
                        <Users className="mr-1.5 h-3 w-3" />
                        {isVibeCommuity ? displayCommunity.membersText : `${community.memberCount} member${community.memberCount !== 1 ? 's' : ''}`}
                    </p>
                    {!isVibeCommuity && community.isPrivate && (
                      <Badge variant="secondary" className="mt-2 text-xs">
                        Private
                      </Badge>
                    )}
                  </CardContent>
                  <div className="p-3 sm:p-4 pt-0">
                     <Button 
                       variant="outline" 
                       className="w-full group border-accent text-accent hover:bg-accent/10 hover:text-accent shadow-[0_0_8px_hsl(var(--accent)/0.3)] hover:shadow-[0_0_10px_hsl(var(--accent)/0.5)] transition-all duration-300 text-xs sm:text-sm" 
                       onClick={() => {
                         if (isVibeCommuity) {
                           router.push('/communities');
                         } else {
                           router.push(`/communities?communityId=${community.id}`);
                         }
                       }}
                     >
                        {isVibeCommuity ? 'View Community' : 'Join Community'}
                     </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-10">
            <p>No communities to discover right now. Why not make one?</p>
          </div>
        )}
      </section>
      
      {/* Community Creation Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <PlusCircle className="mr-2 h-5 w-5" />
              Create Your Community
            </DialogTitle>
            <DialogDescription>
              Step {currentStep} of {totalSteps}: Build your community with custom settings and permissions.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {/* Progress indicator */}
            <div className="flex items-center justify-between mb-6">
              {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step <= currentStep
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {step < currentStep ? <CheckCircle className="h-4 w-4" /> : step}
                  </div>
                  {step < totalSteps && (
                    <div className={`w-12 h-1 mx-2 ${
                      step < currentStep ? 'bg-primary' : 'bg-muted'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Community Name *</Label>
                  <Input
                    id="name"
                    {...form.register('name')}
                    placeholder="Enter community name"
                    className="w-full"
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    {...form.register('description')}
                    placeholder="Describe what your community is about"
                    rows={4}
                    className="w-full"
                  />
                  {form.formState.errors.description && (
                    <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isPrivate"
                    checked={form.watch('isPrivate')}
                    onCheckedChange={(checked) => form.setValue('isPrivate', checked)}
                  />
                  <Label htmlFor="isPrivate">Private Community</Label>
                  <span className="text-sm text-muted-foreground">
                    (Members need invitation to join)
                  </span>
                </div>
              </div>
            )}
            
            {/* Step 2: Visual Customization */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <Label>Community Logo</Label>
                  <div className="flex items-center space-x-4">
                    <div className="w-20 h-20 border-2 border-dashed border-muted-foreground rounded-lg flex items-center justify-center overflow-hidden">
                      {logoPreview ? (
                        <Image
                          src={logoPreview}
                          alt="Logo preview"
                          width={80}
                          height={80}
                          className="object-cover w-full h-full"
                          quality={95}
                          unoptimized={logoPreview.startsWith('data:')}
                        />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => logoInputRef.current?.click()}
                        className="w-full"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Logo
                      </Button>
                      <p className="text-xs text-muted-foreground mt-1">
                        PNG, JPG up to 5MB. Recommended: 512x512px
                      </p>
                    </div>
                    {logoPreview && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setLogoPreview(null);
                          setLogoFile(null);
                          if (logoInputRef.current) logoInputRef.current.value = '';
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </div>
                
                <div className="space-y-4">
                  <Label>Community Banner</Label>
                  <div className="space-y-4">
                    <div className="w-full h-32 border-2 border-dashed border-muted-foreground rounded-lg flex items-center justify-center overflow-hidden">
                      {bannerPreview ? (
                        <Image
                          src={bannerPreview}
                          alt="Banner preview"
                          width={400}
                          height={128}
                          className="object-cover w-full h-full"
                          quality={95}
                          unoptimized={bannerPreview.startsWith('data:')}
                        />
                      ) : (
                        <div className="text-center">
                          <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">Banner Preview</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => bannerInputRef.current?.click()}
                        className="flex-1"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Banner
                      </Button>
                      {bannerPreview && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setBannerPreview(null);
                            setBannerFile(null);
                            if (bannerInputRef.current) bannerInputRef.current.value = '';
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG up to 10MB. Recommended: 1920x480px
                    </p>
                  </div>
                  <input
                    ref={bannerInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleBannerUpload}
                    className="hidden"
                  />
                </div>
              </div>
            )}
            
            {/* Step 3: Member Permissions */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2 flex items-center">
                    <UserCheck className="mr-2 h-5 w-5" />
                    Member Permissions
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Set what regular members can do in your community.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Object.entries(memberPermissions).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <Label htmlFor={`member-${key}`} className="text-sm">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </Label>
                        <Switch
                          id={`member-${key}`}
                          checked={value}
                          onCheckedChange={(checked) => 
                            updatePermission('member', key as keyof CommunityPermissions, checked)
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Step 4: Moderator & Admin Permissions */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2 flex items-center">
                    <Shield className="mr-2 h-5 w-5" />
                    Moderator Permissions
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Set what moderators can do in your community.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    {Object.entries(moderatorPermissions).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <Label htmlFor={`mod-${key}`} className="text-sm">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </Label>
                        <Switch
                          id={`mod-${key}`}
                          checked={value}
                          onCheckedChange={(checked) => 
                            updatePermission('moderator', key as keyof CommunityPermissions, checked)
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-semibold mb-2 flex items-center">
                    <Crown className="mr-2 h-5 w-5" />
                    Admin Permissions
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Set what admins can do in your community. Admins have elevated privileges.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Object.entries(adminPermissions).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <Label htmlFor={`admin-${key}`} className="text-sm">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </Label>
                        <Switch
                          id={`admin-${key}`}
                          checked={value}
                          onCheckedChange={(checked) => 
                            updatePermission('admin', key as keyof CommunityPermissions, checked)
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="bg-muted/30 p-4 rounded-lg">
                  <h4 className="font-semibold text-sm mb-2 flex items-center">
                    <Crown className="mr-2 h-4 w-4 text-primary" />
                    Owner Permissions
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    As the owner, you have all permissions and full control over the community.
                    This cannot be changed.
                  </p>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  disabled={isCreating}
                >
                  Previous
                </Button>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setCurrentStep(1);
                }}
                disabled={isCreating}
              >
                Cancel
              </Button>
              
              {currentStep < totalSteps ? (
                <Button
                  type="button"
                  onClick={() => {
                    if (currentStep === 1) {
                      form.trigger().then((isValid) => {
                        if (isValid) {
                          setCurrentStep(currentStep + 1);
                        }
                      });
                    } else {
                      setCurrentStep(currentStep + 1);
                    }
                  }}
                  disabled={isCreating}
                >
                  Next
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleCreateCommunity}
                  disabled={isCreating || !form.formState.isValid}
                  className="min-w-[120px]"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Community'
                  )}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

    