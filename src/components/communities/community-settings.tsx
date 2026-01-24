"use client";

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Settings, 
  Upload, 
  ImageIcon, 
  X, 
  Shield, 
  Crown, 
  UserCheck, 
  Users,
  Hash,
  Plus,
  Edit2,
  Trash2,
  Save,
  Camera,
  Loader2,
  UserMinus,
  UserPlus,
  Ban,
  AlertTriangle,
  Check,
  Clock,
  MessageSquare,
  Megaphone,
  Music,
  Gamepad2,
  BookOpen,
  Code,
  Palette,
  Coffee,
  Heart,
  Star,
  Zap,
  Globe,
  Lock,
  Eye,
  Mic,
  Video,
  FileText,
  Calendar,
  Target,
  Lightbulb,
  Gift,
  Trophy,
  Rocket,
  Compass,
  Map,
  Headphones,
  Monitor,
  Smartphone,
  Wifi,
  Database,
  Server,
  Cloud,
  HardDrive,
  Cpu,
  MemoryStick,
  Battery,
  Bluetooth,
  Radio,
  Tv,
  Speaker,
  Volume2,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Shuffle,
  Repeat,
  Download,
  Share,
  Link,
  Copy,
  Scissors,
  Paperclip,
  Pin,
  Flag,
  Bookmark,
  Tag,
  Filter,
  Search,
  Move,
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Maximize,
  Minimize,
  Square,
  Circle,
  Triangle,
  Hexagon,
  Pentagon,
  Octagon
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { User } from 'firebase/auth';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import MessageCleanupManager from './message-cleanup-manager';

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
  members: string[];
  moderators: string[];
  admins: string[];
  bannedUsers?: string[];
  createdAt: any;
  tags: string[];
  permissions?: {
    member: CommunityPermissions;
    moderator: CommunityPermissions;
    admin: CommunityPermissions;
    owner: CommunityPermissions;
    channels?: {
      [channelId: string]: {
        allowedRoles: string[];
        allowedMessageTypes: string[];
      }
    };
  };
}

interface Channel {
  id: string;
  name: string;
  description?: string;
  type: 'text';
  icon?: React.ElementType;
  iconName?: string;
  createdAt?: any;
  createdBy?: string;
}

// Available channel icons (white/outline style)
const channelIconOptions = [
  { icon: Hash, name: 'General' },
  { icon: MessageSquare, name: 'Chat' },
  { icon: Megaphone, name: 'Announcements' },
  { icon: Music, name: 'Music' },
  { icon: Gamepad2, name: 'Gaming' },
  { icon: BookOpen, name: 'Reading' },
  { icon: Code, name: 'Programming' },
  { icon: Palette, name: 'Art' },
  { icon: Coffee, name: 'Casual' },
  { icon: Heart, name: 'Social' },
  { icon: Star, name: 'Featured' },
  { icon: Zap, name: 'Events' },
  { icon: Globe, name: 'Global' },
  { icon: Lock, name: 'Private' },
  { icon: Eye, name: 'Public' },
  { icon: Mic, name: 'Voice' },
  { icon: Video, name: 'Video' },
  { icon: ImageIcon, name: 'Media' },
  { icon: FileText, name: 'Documents' },
  { icon: Calendar, name: 'Schedule' },
  { icon: Clock, name: 'Updates' },
  { icon: Target, name: 'Goals' },
  { icon: Lightbulb, name: 'Ideas' },
  { icon: Gift, name: 'Rewards' },
  { icon: Trophy, name: 'Achievements' },
  { icon: Rocket, name: 'Projects' },
  { icon: Compass, name: 'Navigation' },
  { icon: Map, name: 'Locations' },
  { icon: Camera, name: 'Photos' },
  { icon: Headphones, name: 'Audio' },
  { icon: Monitor, name: 'Tech' },
  { icon: Smartphone, name: 'Mobile' },
  { icon: Wifi, name: 'Network' },
  { icon: Database, name: 'Data' },
  { icon: Server, name: 'Backend' },
  { icon: Cloud, name: 'Cloud' },
  { icon: HardDrive, name: 'Storage' },
  { icon: Cpu, name: 'Hardware' },
  { icon: MemoryStick, name: 'Memory' },
  { icon: Battery, name: 'Power' },
  { icon: Bluetooth, name: 'Wireless' },
  { icon: Radio, name: 'Broadcast' },
  { icon: Tv, name: 'Television' },
  { icon: Speaker, name: 'Sound' },
  { icon: Volume2, name: 'Volume' },
  { icon: Play, name: 'Media Player' },
  { icon: Pause, name: 'Pause' },
  { icon: SkipForward, name: 'Next' },
  { icon: SkipBack, name: 'Previous' },
  { icon: Shuffle, name: 'Random' },
  { icon: Repeat, name: 'Loop' },
  { icon: Download, name: 'Downloads' },
  { icon: Upload, name: 'Uploads' },
  { icon: Share, name: 'Sharing' },
  { icon: Link, name: 'Links' },
  { icon: Copy, name: 'Copy' },
  { icon: Scissors, name: 'Tools' },
  { icon: Paperclip, name: 'Attachments' },
  { icon: Pin, name: 'Pinned' },
  { icon: Flag, name: 'Reports' },
  { icon: Bookmark, name: 'Bookmarks' },
  { icon: Tag, name: 'Tags' },
  { icon: Filter, name: 'Filter' },
  { icon: Search, name: 'Search' },
  { icon: Move, name: 'Move' },
  { icon: RotateCcw, name: 'Undo' },
  { icon: RotateCw, name: 'Redo' },
  { icon: FlipHorizontal, name: 'Flip H' },
  { icon: FlipVertical, name: 'Flip V' },
  { icon: Maximize, name: 'Maximize' },
  { icon: Minimize, name: 'Minimize' },
  { icon: Square, name: 'Square' },
  { icon: Circle, name: 'Circle' },
  { icon: Triangle, name: 'Triangle' },
  { icon: Hexagon, name: 'Hexagon' },
  { icon: Pentagon, name: 'Pentagon' },
  { icon: Octagon, name: 'Octagon' }
];

interface CommunitySettingsProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  community: Community | null;
  currentUser: User | null;
  onSave: (updates: Partial<Community>) => Promise<void>;
  onChannelCreate: (channel: { name: string; description: string; type: 'text'; icon?: React.ElementType; permissions?: { allowedRoles: string[]; allowedMessageTypes: string[] } }) => Promise<void>;
  onChannelUpdate: (channelId: string, updates: { name?: string; description?: string; icon?: React.ElementType; permissions?: { allowedRoles: string[]; allowedMessageTypes: string[] } }) => Promise<void>;
  onChannelDelete: (channelId: string) => Promise<void>;
  onCommunityDelete?: () => Promise<void>;
  channels: Channel[];
  communityMembers: Array<{
    id: string;
    name: string;
    avatarUrl?: string;
  }>;
}

export default function CommunitySettings({
  isOpen,
  onOpenChange,
  community,
  currentUser,
  onSave,
  onChannelCreate,
  onChannelUpdate,
  onChannelDelete,
  onCommunityDelete,
  channels,
  communityMembers
}: CommunitySettingsProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [isSaving, setIsSaving] = useState(false);
  
  // Basic info state
  const [name, setName] = useState(community?.name || '');
  const [description, setDescription] = useState(community?.description || '');
  const [isPrivate, setIsPrivate] = useState(community?.isPrivate || false);
  
  // Tags management state
  const [tags, setTags] = useState<string[]>(community?.tags || []);
  const [newTag, setNewTag] = useState('');
  
  // Image upload state
  const [logoPreview, setLogoPreview] = useState<string | null>(community?.logoUrl || null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(community?.bannerUrl || null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  
  // Channel management state
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDescription, setNewChannelDescription] = useState('');
  
  // Message cleanup state
  const [showCleanupManager, setShowCleanupManager] = useState(false);
  const [newChannelIcon, setNewChannelIcon] = useState<React.ElementType>(Hash);
  const [editingChannel, setEditingChannel] = useState<string | null>(null);
  const [editChannelName, setEditChannelName] = useState('');
  const [editChannelDescription, setEditChannelDescription] = useState('');
  const [editChannelIcon, setEditChannelIcon] = useState<React.ElementType>(Hash);
  
  // Member management state
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [memberAction, setMemberAction] = useState<'promote' | 'demote' | 'kick' | 'ban' | 'unban' | null>(null);
  const [targetRole, setTargetRole] = useState<'member' | 'moderator' | 'admin'>('member');
  const [actionConfirmText, setActionConfirmText] = useState('');
  
  // Banned users management state
  const [selectedBannedUsers, setSelectedBannedUsers] = useState<Set<string>>(new Set());
  const [bannedUsersDetails, setBannedUsersDetails] = useState<Array<{ id: string; name: string; avatarUrl?: string }>>([]);
  
  // Delete community state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Permissions state
  const [memberPermissions, setMemberPermissions] = useState<CommunityPermissions>(
    community?.permissions?.member || {
      canInviteMembers: false,
      canCreateChannels: false,
      canDeleteMessages: false,
      canMentionEveryone: false,
      canManageRoles: false,
      canKickMembers: false,
      canBanMembers: false,
      canManageServer: false,
    }
  );
  
  const [moderatorPermissions, setModeratorPermissions] = useState<CommunityPermissions>(
    community?.permissions?.moderator || {
      canInviteMembers: true,
      canCreateChannels: true,
      canDeleteMessages: true,
      canMentionEveryone: true,
      canManageRoles: false,
      canKickMembers: true,
      canBanMembers: true, // Allow moderators to ban members
      canManageServer: false,
    }
  );
  
  const [adminPermissions, setAdminPermissions] = useState<CommunityPermissions>(
    community?.permissions?.admin || {
      canInviteMembers: true,
      canCreateChannels: true,
      canDeleteMessages: true,
      canMentionEveryone: true,
      canManageRoles: true,
      canKickMembers: true,
      canBanMembers: true,
      canManageServer: true,
    }
  );
  
  // Channel permissions state
  const [channelPermissions, setChannelPermissions] = useState<{
    [channelId: string]: {
      allowedRoles: string[];
      allowedMessageTypes: string[];
    }
  }>({});
  
  useEffect(() => {
    if (community) {
      const permissions: { [key: string]: { allowedRoles: string[], allowedMessageTypes: string[] } } = {};
      channels.forEach(channel => {
        permissions[channel.id] = {
          allowedRoles: community.permissions?.channels?.[channel.id]?.allowedRoles || [],
          allowedMessageTypes: community.permissions?.channels?.[channel.id]?.allowedMessageTypes || []
        };
      });
      setChannelPermissions(permissions);
    }
  }, [community, channels]);

  if (!community || !currentUser) return null;

  const isOwner = community.ownerId === currentUser.uid || 
                 (community.id === 'vibe-community-main' && currentUser.email === 'sheikhabduh6@gmail.com');
  const isAdmin = community.admins?.includes(currentUser.uid);
  const isModerator = community.moderators?.includes(currentUser.uid);
  
  // Helper function to create role change notifications
  const createRoleChangeNotification = async (
    userId: string,
    actorName: string,
    actorAvatarUrl: string | null,
    fromRole: string,
    toRole: string,
    isPromotion: boolean
  ) => {
    try {
      const activityRef = collection(db, `users/${userId}/activityItems`);
      await addDoc(activityRef, {
        type: isPromotion ? 'role_promoted' : 'role_demoted',
        actorId: currentUser.uid,
        actorName: actorName,
        actorAvatarUrl: actorAvatarUrl,
        contentSnippet: `${isPromotion ? 'promoted' : 'demoted'} you ${isPromotion ? 'to' : 'from'} ${toRole} in ${community.name}`,
        timestamp: serverTimestamp(),
        isRead: false,
        communityId: community.id,
        targetUserId: userId,
        roleChangeDetails: {
          fromRole,
          toRole,
          communityName: community.name
        }
      });
      console.log(`✅ Role change notification created for user ${userId}: ${fromRole} → ${toRole}`);
    } catch (error) {
      console.error('Error creating role change notification:', error);
    }
  };

  // Handle file uploads
  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
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
      if (file.size > 10 * 1024 * 1024) {
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

  // Handle permission updates
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

  // Handle channel management
  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) {
      toast({
        variant: "destructive",
        title: "Invalid Channel Name",
        description: "Please enter a channel name.",
      });
      return;
    }

    try {
      const newChannel = await onChannelCreate({
        name: newChannelName.trim(),
        description: newChannelDescription.trim(),
        type: 'text',
        icon: newChannelIcon,
        permissions: {
          allowedRoles: ['owner', 'admin', 'moderator', 'member'],
          allowedMessageTypes: ['text', 'images', 'files', 'links', 'embeds']
        }
      });
      setNewChannelName('');
      setNewChannelDescription('');
      setNewChannelIcon(Hash);
      toast({
        title: "Channel Created",
        description: `#${newChannelName} has been created successfully.`,
      });
    } catch (error) {
      console.error('Error creating channel:', error);
      toast({
        variant: "destructive",
        title: "Failed to Create Channel",
        description: "Please try again.",
      });
    }
  };

  const handleEditChannel = (channel: Channel) => {
    setEditingChannel(channel.id);
    setEditChannelName(channel.name);
    setEditChannelDescription(channel.description || '');
    setEditChannelIcon(channel.icon || Hash);
  };

  const handleSaveChannelEdit = async () => {
    if (!editingChannel || !editChannelName.trim()) return;

    try {
      await onChannelUpdate(editingChannel, {
        name: editChannelName.trim(),
        description: editChannelDescription.trim(),
        icon: editChannelIcon,
        permissions: channelPermissions[editingChannel.id] || {
          allowedRoles: ['owner', 'admin', 'moderator', 'member'],
          allowedMessageTypes: ['text', 'images', 'files', 'links', 'embeds']
        }
      });
      setEditingChannel(null);
      setEditChannelName('');
      setEditChannelDescription('');
      setEditChannelIcon(Hash);
      toast({
        title: "Channel Updated",
        description: "Channel has been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating channel:', error);
      toast({
        variant: "destructive",
        title: "Failed to Update Channel",
        description: "Please try again.",
      });
    }
  };

  const handleDeleteChannel = async (channelId: string) => {
    try {
      await onChannelDelete(channelId);
      toast({
        title: "Channel Deleted",
        description: "Channel has been deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting channel:', error);
      toast({
        variant: "destructive",
        title: "Failed to Delete Channel",
        description: "Please try again.",
      });
    }
  };
  
  // Member management functions
  const getUserRole = (userId: string): 'owner' | 'admin' | 'moderator' | 'member' => {
    if (community?.ownerId === userId) return 'owner';
    if (community?.admins?.includes(userId)) return 'admin';
    if (community?.moderators?.includes(userId)) return 'moderator';
    return 'member';
  };
  
  const handleMemberSelection = (memberId: string) => {
    const newSelection = new Set(selectedMembers);
    if (newSelection.has(memberId)) {
      newSelection.delete(memberId);
    } else {
      newSelection.add(memberId);
    }
    setSelectedMembers(newSelection);
  };
  
  const handleBannedUserSelection = (userId: string) => {
    const newSelection = new Set(selectedBannedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedBannedUsers(newSelection);
  };
  
  // Function to handle unbanning directly from banned users list
  const handleUnbanUsers = async (userIds: string[]) => {
    if (!community || userIds.length === 0) return;
    
    try {
      const updates: Partial<Community> = {
        ...community,
        bannedUsers: community.bannedUsers?.filter(id => !userIds.includes(id)) || []
      };
      
      await onSave(updates);
      
      toast({
        title: "Users Unbanned",
        description: `Successfully unbanned ${userIds.length} user(s). They can now rejoin the community.`,
      });
      
      // Clear selection
      setSelectedBannedUsers(new Set());
      
    } catch (error) {
      console.error('Error unbanning users:', error);
      toast({
        variant: "destructive",
        title: "Failed to Unban Users",
        description: "Please try again.",
      });
    }
  };
  
  const handleMemberAction = async () => {
    if (!memberAction || selectedMembers.size === 0 || !community) return;
    
    try {
      const memberIds = Array.from(selectedMembers);
      const updates: Partial<Community> = { ...community };
      const actorName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Admin';
      const actorAvatarUrl = currentUser?.photoURL || null;
      
      // Track role changes for notifications
      const roleChanges: Array<{
        userId: string;
        fromRole: string;
        toRole: string;
        isPromotion: boolean;
      }> = [];
      
      switch (memberAction) {
        case 'promote':
          for (const memberId of memberIds) {
            const currentRole = getUserRole(memberId);
            
            // Enforce promotion rules
            if (currentRole === 'member' && (targetRole === 'moderator' || targetRole === 'admin')) {
              if (targetRole === 'moderator') {
                updates.moderators = [...(community.moderators || []), memberId];
                updates.members = community.members?.filter(id => id !== memberId) || [];
                roleChanges.push({ userId: memberId, fromRole: 'member', toRole: 'moderator', isPromotion: true });
              } else if (targetRole === 'admin' && isOwner) {
                updates.admins = [...(community.admins || []), memberId];
                updates.members = community.members?.filter(id => id !== memberId) || [];
                roleChanges.push({ userId: memberId, fromRole: 'member', toRole: 'admin', isPromotion: true });
              }
            } else if (currentRole === 'moderator' && targetRole === 'admin' && isOwner) {
              updates.admins = [...(community.admins || []), memberId];
              updates.moderators = community.moderators?.filter(id => id !== memberId) || [];
              roleChanges.push({ userId: memberId, fromRole: 'moderator', toRole: 'admin', isPromotion: true });
            }
          }
          break;
          
        case 'demote':
          for (const memberId of memberIds) {
            const currentRole = getUserRole(memberId);
            
            // Enforce demotion rules
            if (currentRole === 'admin' && (targetRole === 'moderator' || targetRole === 'member')) {
              updates.admins = community.admins?.filter(id => id !== memberId) || [];
              if (targetRole === 'moderator') {
                updates.moderators = [...(community.moderators || []), memberId];
                roleChanges.push({ userId: memberId, fromRole: 'admin', toRole: 'moderator', isPromotion: false });
              } else {
                updates.members = [...(community.members || []), memberId];
                roleChanges.push({ userId: memberId, fromRole: 'admin', toRole: 'member', isPromotion: false });
              }
            } else if (currentRole === 'moderator' && targetRole === 'member') {
              updates.moderators = community.moderators?.filter(id => id !== memberId) || [];
              updates.members = [...(community.members || []), memberId];
              roleChanges.push({ userId: memberId, fromRole: 'moderator', toRole: 'member', isPromotion: false });
            }
          }
          break;
          
        case 'kick':
          let kickedCount = 0;
          for (const memberId of memberIds) {
            const currentRole = getUserRole(memberId);
            
            // Prevent kicking the owner
            if (community.ownerId === memberId) {
              console.warn(`Cannot kick community owner ${memberId}`);
              continue;
            }
            
            // Check if user is actually a member before trying to kick
            const isActualMember = community.members?.includes(memberId) ||
                                  community.moderators?.includes(memberId) ||
                                  community.admins?.includes(memberId);
            
            if (isActualMember) {
              updates.members = community.members?.filter(id => id !== memberId) || [];
              updates.moderators = community.moderators?.filter(id => id !== memberId) || [];
              updates.admins = community.admins?.filter(id => id !== memberId) || [];
              kickedCount++;
            }
          }
          // Only decrement member count by the number of actually kicked members
          if (kickedCount > 0) {
            updates.memberCount = Math.max((updates.memberCount || 1) - kickedCount, 1);
          }
          break;
          
        case 'ban':
          let bannedCount = 0;
          for (const memberId of memberIds) {
            const currentRole = getUserRole(memberId);
            
            // Prevent banning the owner
            if (community.ownerId === memberId) {
              console.warn(`Cannot ban community owner ${memberId}`);
              continue;
            }
            
            // Check if user is actually a member before trying to ban
            const isActualMember = community.members?.includes(memberId) ||
                                  community.moderators?.includes(memberId) ||
                                  community.admins?.includes(memberId);
            
            if (isActualMember) {
              // Remove from all role arrays
              updates.members = community.members?.filter(id => id !== memberId) || [];
              updates.moderators = community.moderators?.filter(id => id !== memberId) || [];
              updates.admins = community.admins?.filter(id => id !== memberId) || [];
              
              // Add to banned users list
              updates.bannedUsers = [...(community.bannedUsers || []), memberId];
              bannedCount++;
            }
          }
          // Only decrement member count by the number of actually banned members
          if (bannedCount > 0) {
            updates.memberCount = Math.max((updates.memberCount || 1) - bannedCount, 1);
          }
          break;
          
        case 'unban':
          let unbannedCount = 0;
          for (const memberId of memberIds) {
            // Check if user is actually banned
            if (community.bannedUsers?.includes(memberId)) {
              // Remove from banned users list (but don't add back to members - they need to rejoin)
              updates.bannedUsers = community.bannedUsers?.filter(id => id !== memberId) || [];
              unbannedCount++;
            }
          }
          break;
      }
      
      await onSave(updates);
      
      // Create notifications for role changes
      for (const change of roleChanges) {
        await createRoleChangeNotification(
          change.userId,
          actorName,
          actorAvatarUrl,
          change.fromRole,
          change.toRole,
          change.isPromotion
        );
      }
      
      const actionText = memberAction === 'promote' ? 'promoted' : memberAction === 'demote' ? 'demoted' : memberAction === 'kick' ? 'kicked' : memberAction === 'ban' ? 'banned' : 'unbanned';
      
      toast({
        title: "Members Updated",
        description: `Successfully ${actionText} ${memberIds.length} member(s)${roleChanges.length > 0 ? ` and sent notifications` : ''}.`,
      });
      
      // Reset selection
      setSelectedMembers(new Set());
      setMemberAction(null);
      setActionConfirmText('');
      
    } catch (error) {
      console.error('Error updating members:', error);
      toast({
        variant: "destructive",
        title: "Failed to Update Members",
        description: "Please try again.",
      });
    }
  };
  
  // Delete community function
  const handleDeleteCommunity = async () => {
    if (!community || !onCommunityDelete) return;
    
    if (deleteConfirmText.toLowerCase() !== community.name.toLowerCase()) {
      toast({
        variant: "destructive",
        title: "Confirmation Failed",
        description: "Please type the community name exactly as shown.",
      });
      return;
    }
    
    setIsDeleting(true);
    try {
      await onCommunityDelete();
      
      toast({
        title: "Community Deleted",
        description: `${community.name} has been permanently deleted.`,
      });
      
      onOpenChange(false);
      
    } catch (error) {
      console.error('Error deleting community:', error);
      toast({
        variant: "destructive",
        title: "Failed to Delete Community",
        description: "Please try again.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle save
  // Handle tags management
  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim()) && tags.length < 10) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Default owner permissions
      const defaultOwnerPermissions = {
        canInviteMembers: true,
        canCreateChannels: true,
        canDeleteMessages: true,
        canMentionEveryone: true,
        canManageRoles: true,
        canKickMembers: true,
        canBanMembers: true,
        canManageServer: true,
      };

      const updates: Partial<Community> = {
        name: name.trim(),
        description: description.trim(),
        isPrivate,
        tags: tags,
        permissions: {
          member: memberPermissions,
          moderator: moderatorPermissions,
          admin: adminPermissions,
          owner: community.permissions?.owner || defaultOwnerPermissions, // Safe fallback for owner permissions
          channels: channelPermissions
        }
      };

      // Handle file uploads with better progress feedback
      const uploadPromises = [];
      
      if (logoFile) {
        uploadPromises.push(
          uploadToCloudinary(logoFile, 'logo')
            .then(logoUrl => {
              if (logoUrl) {
                updates.logoUrl = logoUrl;
              }
            })
            .catch(error => {
              console.error('Error uploading logo:', error);
              toast({
                variant: "destructive",
                title: "Logo Upload Failed",
                description: error.message || "Failed to upload logo. Settings will be saved without logo changes.",
              });
            })
        );
      }
      
      if (bannerFile) {
        uploadPromises.push(
          uploadToCloudinary(bannerFile, 'banner')
            .then(bannerUrl => {
              if (bannerUrl) {
                updates.bannerUrl = bannerUrl;
              }
            })
            .catch(error => {
              console.error('Error uploading banner:', error);
              toast({
                variant: "destructive",
                title: "Banner Upload Failed",
                description: error.message || "Failed to upload banner. Settings will be saved without banner changes.",
              });
            })
        );
      }
      
      // Show upload progress if files are being uploaded
      if (uploadPromises.length > 0) {
        toast({
          title: "Uploading Images",
          description: `Uploading ${uploadPromises.length} image(s). This may take a moment...`,
        });
        
        // Wait for all uploads to complete (or fail)
        await Promise.allSettled(uploadPromises);
      }

      await onSave(updates);
      
      // Clear file states after successful save
      setLogoFile(null);
      setBannerFile(null);
      
      // Close the modal after successful save to allow UI to refresh
      onOpenChange(false);
      
      toast({
        title: "Settings Saved",
        description: "Community settings have been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        variant: "destructive",
        title: "Failed to Save Settings",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Upload file to Cloudinary with retry logic
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
    formData.append('upload_preset', 'vibe_app');
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
          throw new Error(`Upload timed out after ${retries} attempts. Please try with a smaller image or check your internet connection.`);
        }
        
        if (attempt === retries) {
          console.error(`Error uploading ${type} to Cloudinary (final attempt):`, error);
          throw error;
        }
        
        // Wait before retry
        console.warn(`Upload attempt ${attempt} failed, retrying...`, error);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    
    throw new Error('Upload failed after all retry attempts');
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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center">
            <Settings className="mr-2 h-5 w-5" />
            {community.name} Settings
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-6 flex-shrink-0">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
            <TabsTrigger value="channels">Channels</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="banned">Banned</TabsTrigger>
            {community?.id === 'vibe-community-main' && (
              <TabsTrigger value="cleanup">Cleanup</TabsTrigger>
            )}
          </TabsList>

          <ScrollArea className="flex-1 mt-4 overflow-y-auto">
            <div className="pr-4">
            <TabsContent value="overview" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>Update your community's basic details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Community Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter community name"
                    />
                    <p className="text-xs text-muted-foreground">
                      Changing the community name will affect all members and channels.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe your community"
                      rows={4}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isPrivate"
                      checked={isPrivate}
                      onCheckedChange={setIsPrivate}
                    />
                    <Label htmlFor="isPrivate">Private Community</Label>
                  </div>
                </CardContent>
              </Card>

              {/* Tags Management - Only for owners and admins */}
              {(isOwner || isAdmin) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Community Tags</CardTitle>
                    <CardDescription>Add tags to help users discover your community</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="newTag">Add Tag</Label>
                      <div className="flex space-x-2">
                        <Input
                          id="newTag"
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          placeholder="Enter a tag"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddTag();
                            }
                          }}
                          maxLength={20}
                        />
                        <Button
                          type="button"
                          onClick={handleAddTag}
                          disabled={!newTag.trim() || tags.includes(newTag.trim()) || tags.length >= 10}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Tags help users discover your community. Maximum 10 tags, 20 characters each.
                      </p>
                    </div>
                    
                    {tags.length > 0 && (
                      <div className="space-y-2">
                        <Label>Current Tags</Label>
                        <div className="flex flex-wrap gap-2">
                          {tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="flex items-center space-x-1">
                              <span>{tag}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                                onClick={() => handleRemoveTag(tag)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Danger Zone - Only for owners of non-vibe communities */}
              {isOwner && community.id !== 'vibe-community-main' && (
                <Card className="border-destructive/50">
                  <CardHeader>
                    <CardTitle className="text-destructive flex items-center">
                      <AlertTriangle className="mr-2 h-5 w-5" />
                      Danger Zone
                    </CardTitle>
                    <CardDescription>
                      Irreversible and destructive actions. Please be certain.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="destructive"
                      onClick={() => setShowDeleteDialog(true)}
                      className="w-full"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Community Permanently
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      This will permanently delete the community, all channels, messages, and remove all members. This action cannot be undone.
                    </p>
                  </CardContent>
                </Card>
              )}
              
              {/* Special note for vibe community owner */}
              {isOwner && community.id === 'vibe-community-main' && (
                <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
                  <CardHeader>
                    <CardTitle className="text-blue-800 dark:text-blue-200 flex items-center">
                      <Crown className="mr-2 h-5 w-5" />
                      Vibe Community Owner
                    </CardTitle>
                    <CardDescription className="text-blue-700 dark:text-blue-300">
                      You are the owner of the main Vibe community with full administrative privileges.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      As the Vibe community owner, you have access to all community management features including:
                    </p>
                    <ul className="mt-2 text-sm text-blue-700 dark:text-blue-300 space-y-1">
                      <li>• Full member and role management</li>
                      <li>• Complete community customization</li>
                      <li>• Channel creation and management</li>
                      <li>• Permission system configuration</li>
                      <li>• Community moderation tools</li>
                    </ul>
                    <p className="mt-3 text-xs text-blue-600 dark:text-blue-400">
                      Note: The main Vibe community cannot be deleted to preserve platform integrity.
                    </p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Community Images</CardTitle>
                  <CardDescription>Update your community's logo and banner</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
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
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="permissions" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <UserCheck className="mr-2 h-5 w-5" />
                    Member Permissions
                  </CardTitle>
                  <CardDescription>Set what regular members can do</CardDescription>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="mr-2 h-5 w-5" />
                    Moderator Permissions
                  </CardTitle>
                  <CardDescription>Set what moderators can do</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Crown className="mr-2 h-5 w-5" />
                    Admin Permissions
                  </CardTitle>
                  <CardDescription>Set what admins can do</CardDescription>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>

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
            </TabsContent>

            <TabsContent value="channels" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Plus className="mr-2 h-5 w-5" />
                    Create New Channel
                  </CardTitle>
                  <CardDescription>Add a new channel to your community</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newChannelName">Channel Name</Label>
                    <Input
                      id="newChannelName"
                      value={newChannelName}
                      onChange={(e) => setNewChannelName(e.target.value)}
                      placeholder="Enter channel name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newChannelDescription">Description (Optional)</Label>
                    <Input
                      id="newChannelDescription"
                      value={newChannelDescription}
                      onChange={(e) => setNewChannelDescription(e.target.value)}
                      placeholder="Describe what this channel is for"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Channel Icon</Label>
                    <div className="grid grid-cols-8 gap-2 max-h-32 overflow-y-auto border rounded-lg p-2">
                      {channelIconOptions.map((option) => {
                        const IconComponent = option.icon;
                        return (
                          <Button
                            key={option.name}
                            type="button"
                            variant={newChannelIcon === option.icon ? "default" : "ghost"}
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setNewChannelIcon(option.icon)}
                            title={option.name}
                          >
                            <IconComponent className="h-4 w-4" />
                          </Button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Selected: {channelIconOptions.find(opt => opt.icon === newChannelIcon)?.name || 'General'}
                    </p>
                  </div>
                  <Button onClick={handleCreateChannel} disabled={!newChannelName.trim()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Channel
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Hash className="mr-2 h-5 w-5" />
                    Existing Channels
                  </CardTitle>
                  <CardDescription>Manage your community channels</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {channels.map((channel) => (
                      <div key={channel.id} className="flex items-center justify-between p-3 border rounded-lg">
                        {editingChannel === channel.id ? (
                          <div className="flex-1 space-y-2">
                            <Input
                              value={editChannelName}
                              onChange={(e) => setEditChannelName(e.target.value)}
                              placeholder="Channel name"
                            />
                            <Input
                              value={editChannelDescription}
                              onChange={(e) => setEditChannelDescription(e.target.value)}
                              placeholder="Channel description"
                            />
                            <div className="space-y-2">
                              <Label className="text-sm">Channel Icon</Label>
                              <div className="grid grid-cols-8 gap-1 max-h-24 overflow-y-auto border rounded p-2">
                                {channelIconOptions.map((option) => {
                                  const IconComponent = option.icon;
                                  return (
                                    <Button
                                      key={option.name}
                                      type="button"
                                      variant={editChannelIcon === option.icon ? "default" : "ghost"}
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={() => setEditChannelIcon(option.icon)}
                                      title={option.name}
                                    >
                                      <IconComponent className="h-3 w-3" />
                                    </Button>
                                  );
                                })}
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button size="sm" onClick={handleSaveChannelEdit}>
                                <Save className="mr-1 h-3 w-3" />
                                Save
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingChannel(null)}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex-1">
                              <div className="flex items-center">
                                {React.createElement(channel.icon || Hash, { className: "mr-2 h-4 w-4 text-muted-foreground" })}
                                <span className="font-medium">{channel.name}</span>
                              </div>
                              {channel.description && (
                                <p className="text-sm text-muted-foreground mt-1">{channel.description}</p>
                              )}
                            </div>
                            <div className="flex space-x-2">
                              <Button size="sm" variant="ghost" onClick={() => handleEditChannel(channel)}>
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => handleDeleteChannel(channel.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                    {channels.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">
                        No channels found. Create your first channel above.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* Channel Permissions */}
              {channels.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Lock className="mr-2 h-5 w-5" />
                      Channel Permissions
                    </CardTitle>
                    <CardDescription>Control who can send messages and what content is allowed in each channel</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue={channels[0]?.id} className="w-full">
                      <TabsList className="mb-4 flex flex-wrap h-auto">
                        {channels.map((channel) => (
                          <TabsTrigger key={channel.id} value={channel.id} className="mb-1">
                            {React.createElement(channel.icon || Hash, { className: "mr-2 h-4 w-4" })}
                            {channel.name}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      
                      {channels.map((channel) => (
                        <TabsContent key={channel.id} value={channel.id} className="space-y-4 pt-2">
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-sm font-medium mb-2">Who can send messages in #{channel.name}?</h4>
                              <div className="space-y-2">
                                {['owner', 'admin', 'moderator', 'member'].map((role) => (
                                  <div key={role} className="flex items-center space-x-2">
                                    <Checkbox 
                                      id={`${channel.id}-role-${role}`}
                                      checked={channelPermissions[channel.id]?.allowedRoles.includes(role)}
                                      onCheckedChange={(checked) => {
                                        const newPermissions = { ...channelPermissions };
                                        if (!newPermissions[channel.id]) {
                                          newPermissions[channel.id] = {
                                            allowedRoles: [],
                                            allowedMessageTypes: []
                                          };
                                        }
                                        
                                        if (checked) {
                                          // Add role if not already included
                                          if (!newPermissions[channel.id].allowedRoles.includes(role)) {
                                            newPermissions[channel.id].allowedRoles.push(role);
                                          }
                                        } else {
                                          // Remove role
                                          newPermissions[channel.id].allowedRoles = 
                                            newPermissions[channel.id].allowedRoles.filter(r => r !== role);
                                        }
                                        
                                        setChannelPermissions(newPermissions);
                                      }}
                                    />
                                    <Label htmlFor={`${channel.id}-role-${role}`} className="flex items-center">
                                      {role === 'owner' && <Crown className="mr-1 h-3 w-3 text-amber-500" />}
                                      {role === 'admin' && <Shield className="mr-1 h-3 w-3 text-red-500" />}
                                      {role === 'moderator' && <UserCheck className="mr-1 h-3 w-3 text-blue-500" />}
                                      {role === 'member' && <Users className="mr-1 h-3 w-3 text-gray-500" />}
                                      {role.charAt(0).toUpperCase() + role.slice(1)}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="text-sm font-medium mb-2">What content is allowed in #{channel.name}?</h4>
                              <div className="space-y-2">
                                {[
                                  { id: 'text', label: 'Text Messages', icon: MessageSquare },
                                  { id: 'images', label: 'Images', icon: ImageIcon },
                                  { id: 'files', label: 'Files', icon: FileText },
                                  { id: 'links', label: 'Links', icon: Link },
                                  { id: 'embeds', label: 'Embeds', icon: Code }
                                ].map((type) => (
                                  <div key={type.id} className="flex items-center space-x-2">
                                    <Checkbox 
                                      id={`${channel.id}-type-${type.id}`}
                                      checked={channelPermissions[channel.id]?.allowedMessageTypes.includes(type.id)}
                                      onCheckedChange={(checked) => {
                                        const newPermissions = { ...channelPermissions };
                                        if (!newPermissions[channel.id]) {
                                          newPermissions[channel.id] = {
                                            allowedRoles: [],
                                            allowedMessageTypes: []
                                          };
                                        }
                                        
                                        if (checked) {
                                          // Add message type if not already included
                                          if (!newPermissions[channel.id].allowedMessageTypes.includes(type.id)) {
                                            newPermissions[channel.id].allowedMessageTypes.push(type.id);
                                          }
                                        } else {
                                          // Remove message type
                                          newPermissions[channel.id].allowedMessageTypes = 
                                            newPermissions[channel.id].allowedMessageTypes.filter(t => t !== type.id);
                                        }
                                        
                                        setChannelPermissions(newPermissions);
                                      }}
                                    />
                                    <Label htmlFor={`${channel.id}-type-${type.id}`} className="flex items-center">
                                      {React.createElement(type.icon, { className: "mr-1 h-3 w-3" })}
                                      {type.label}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </TabsContent>
                      ))}
                    </Tabs>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="members" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Users className="mr-2 h-5 w-5" />
                      Community Members ({communityMembers.length})
                    </div>
                    {selectedMembers.size > 0 && (
                      <Badge variant="secondary">
                        {selectedMembers.size} selected
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>Manage your community members and their roles</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Member Actions Panel */}
                  {selectedMembers.size > 0 && (
                    <Card className="border-muted">
                      <CardContent className="pt-4">
                        <div className="flex flex-wrap gap-2 mb-4">
                          {Array.from(selectedMembers).some(memberId => {
                            const role = getUserRole(memberId);
                            return role === 'member' || (role === 'moderator' && isOwner);
                          }) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setMemberAction('promote')}
                              className="text-green-600 hover:text-green-700"
                            >
                              <UserPlus className="mr-1 h-3 w-3" />
                              Promote
                            </Button>
                          )}
                          {Array.from(selectedMembers).some(memberId => {
                            const role = getUserRole(memberId);
                            return role === 'admin' || role === 'moderator';
                          }) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setMemberAction('demote')}
                              className="text-yellow-600 hover:text-yellow-700"
                            >
                              <UserMinus className="mr-1 h-3 w-3" />
                              Demote
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setMemberAction('kick')}
                            className="text-orange-600 hover:text-orange-700"
                          >
                            <UserMinus className="mr-1 h-3 w-3" />
                            Kick
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setMemberAction('ban')}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Ban className="mr-1 h-3 w-3" />
                            Ban
                          </Button>
                        </div>
                        
                        {memberAction && (
                          <div className="space-y-3">
                            {(memberAction === 'promote' || memberAction === 'demote') && (
                              <div className="space-y-2">
                                <Label>Target Role</Label>
                                <Select value={targetRole} onValueChange={(value: 'member' | 'moderator' | 'admin') => setTargetRole(value)}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {/* Show available options based on action and current user permissions */}
                                    {memberAction === 'promote' && (
                                      <>
                                        <SelectItem value="moderator">Moderator</SelectItem>
                                        {isOwner && <SelectItem value="admin">Admin</SelectItem>}
                                      </>
                                    )}
                                    {memberAction === 'demote' && (
                                      <>
                                        <SelectItem value="member">Member</SelectItem>
                                        <SelectItem value="moderator">Moderator</SelectItem>
                                      </>
                                    )}
                                  </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                  {memberAction === 'promote' 
                                    ? 'Members can be promoted to Moderator or Admin. Moderators can be promoted to Admin (owner only).' 
                                    : 'Admins can be demoted to Moderator or Member. Moderators can be demoted to Member. Members cannot be demoted.'
                                  }
                                </p>
                              </div>
                            )}
                            
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                onClick={handleMemberAction}
                                variant={memberAction === 'ban' || memberAction === 'kick' ? 'destructive' : 'default'}
                              >
                                <Check className="mr-1 h-3 w-3" />
                                Confirm {memberAction}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setMemberAction(null);
                                  setSelectedMembers(new Set());
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                  
                  {/* Members List */}
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {communityMembers.length > 0 ? (
                      communityMembers.map((member) => {
                        const memberRole = getUserRole(member.id);
                        const isOwnerMember = member.id === community?.ownerId;
                        const canSelectMember = !isOwnerMember && (isOwner || (isAdmin && memberRole !== 'admin'));
                        
                        return (
                          <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                            <div className="flex items-center space-x-3">
                              {canSelectMember && (
                                <Checkbox
                                  checked={selectedMembers.has(member.id)}
                                  onCheckedChange={() => handleMemberSelection(member.id)}
                                />
                              )}
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={member.avatarUrl} alt={member.name} />
                                <AvatarFallback>{member.name.substring(0, 1).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium">{member.name}</span>
                                  {memberRole === 'owner' && (
                                    <Crown className="h-4 w-4 text-amber-500" />
                                  )}
                                  {memberRole === 'admin' && (
                                    <Shield className="h-4 w-4 text-red-500" />
                                  )}
                                  {memberRole === 'moderator' && (
                                    <UserCheck className="h-4 w-4 text-blue-500" />
                                  )}
                                  {memberRole === 'member' && (
                                    <Users className="h-4 w-4 text-gray-500" />
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">{member.id}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Badge
                                variant={memberRole === 'owner' ? 'default' : memberRole === 'admin' ? 'destructive' : memberRole === 'moderator' ? 'secondary' : 'outline'}
                              >
                                {memberRole === 'owner' && <Crown className="mr-1 h-3 w-3" />}
                                {memberRole === 'admin' && <Shield className="mr-1 h-3 w-3" />}
                                {memberRole === 'moderator' && <UserCheck className="mr-1 h-3 w-3" />}
                                {memberRole === 'member' && <Users className="mr-1 h-3 w-3" />}
                                {memberRole.charAt(0).toUpperCase() + memberRole.slice(1)}
                              </Badge>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        <Users className="h-12 w-12 mx-auto mb-4" />
                        <p>No members found.</p>
                        <p className="text-sm">Community members will appear here when they join.</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Role Legend */}
                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-medium mb-2">Role Permissions</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center space-x-2">
                        <Crown className="h-3 w-3 text-amber-500" />
                        <span><strong>Owner:</strong> Full control</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Shield className="h-3 w-3 text-red-500" />
                        <span><strong>Admin:</strong> Manage community</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <UserCheck className="h-3 w-3 text-blue-500" />
                        <span><strong>Moderator:</strong> Moderate content</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Users className="h-3 w-3 text-gray-500" />
                        <span><strong>Member:</strong> Basic access</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="banned" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Ban className="mr-2 h-5 w-5 text-red-500" />
                      Banned Users ({community?.bannedUsers?.length || 0})
                    </div>
                    {selectedBannedUsers.size > 0 && (
                      <Badge variant="secondary">
                        {selectedBannedUsers.size} selected
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Manage users who have been banned from this community. Banned users cannot rejoin until unbanned.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Unban Actions Panel */}
                  {selectedBannedUsers.size > 0 && (
                    <Card className="border-muted">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUnbanUsers(Array.from(selectedBannedUsers))}
                              className="text-green-600 hover:text-green-700"
                            >
                              <UserPlus className="mr-1 h-3 w-3" />
                              Unban Selected ({selectedBannedUsers.size})
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedBannedUsers(new Set())}
                            >
                              Clear Selection
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  {/* Banned Users List */}
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {community?.bannedUsers && community.bannedUsers.length > 0 ? (
                      community.bannedUsers.map((bannedUserId) => {
                        // Find user details from communityMembers or create placeholder
                        const userDetails = communityMembers.find(m => m.id === bannedUserId) || {
                          id: bannedUserId,
                          name: `User ${bannedUserId.substring(0, 8)}...`,
                          avatarUrl: undefined
                        };
                        
                        return (
                          <div key={bannedUserId} className="flex items-center justify-between p-3 border rounded-lg bg-red-50 dark:bg-red-900/10">
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                checked={selectedBannedUsers.has(bannedUserId)}
                                onCheckedChange={() => handleBannedUserSelection(bannedUserId)}
                              />
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={userDetails.avatarUrl} alt={userDetails.name} />
                                <AvatarFallback>{userDetails.name.substring(0, 1).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium">{userDetails.name}</span>
                                  <Ban className="h-4 w-4 text-red-500" />
                                </div>
                                <p className="text-xs text-muted-foreground">{bannedUserId}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Badge variant="destructive" className="text-xs">
                                Banned
                              </Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUnbanUsers([bannedUserId])}
                                className="text-green-600 hover:text-green-700 h-8 px-2"
                              >
                                <UserPlus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        <Ban className="h-12 w-12 mx-auto mb-4 text-green-500" />
                        <p className="text-lg font-medium">No banned users</p>
                        <p className="text-sm">Users who are banned from the community will appear here.</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Info Box */}
                  <div className="p-4 border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex">
                      <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">About Banned Users</p>
                        <ul className="text-blue-700 dark:text-blue-300 space-y-1">
                          <li>• Banned users are completely removed from the community</li>
                          <li>• They cannot rejoin until they are unbanned</li>
                          <li>• Unbanning allows them to join again (they won't automatically rejoin)</li>
                          <li>• All their previous messages and data remain in the community</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {community?.id === 'vibe-community-main' && (
              <TabsContent value="cleanup" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trash2 className="h-5 w-5" />
                      Message Cleanup
                    </CardTitle>
                    <CardDescription>
                      Manage automatic deletion of old messages to keep the community fresh
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="bg-blue-100 dark:bg-blue-900/20 p-2 rounded-full">
                          <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium mb-1">Automatic Cleanup Active</h4>
                          <p className="text-sm text-muted-foreground mb-3">
                            Messages older than 30 days are automatically deleted daily at 2:00 AM UTC to manage storage and keep conversations current.
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-green-600 border-green-200">
                              <Check className="h-3 w-3 mr-1" />
                              Enabled
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Next cleanup: Daily at 2:00 AM UTC
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">Message Cleanup Manager</h4>
                        <p className="text-sm text-muted-foreground">
                          View cleanup history and manually trigger cleanup if needed
                        </p>
                      </div>
                      <Button 
                        onClick={() => setShowCleanupManager(true)}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <Settings className="h-4 w-4" />
                        Manage
                      </Button>
                    </div>

                    <div className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-amber-800 dark:text-amber-200 mb-1">Important Note</p>
                          <p className="text-amber-700 dark:text-amber-300">
                            Deleted messages cannot be recovered. The 30-day retention period ensures important conversations remain accessible while managing storage efficiently.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
            </div>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="flex-shrink-0 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
      
      {/* Delete Community Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Delete Community
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the community,
              remove all members, and delete all channels and messages.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-destructive/10 rounded-md">
              <p className="text-sm font-medium mb-2">This will permanently delete:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• The community "{community?.name}"</li>
                <li>• All channels and messages</li>
                <li>• All member data and roles</li>
                <li>• All community settings and permissions</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="deleteConfirm">
                Type the community name <strong>{community?.name}</strong> to confirm:
              </Label>
              <Input
                id="deleteConfirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={community?.name}
                className="border-destructive focus:ring-destructive"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setDeleteConfirmText('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteCommunity}
              disabled={isDeleting || deleteConfirmText.toLowerCase() !== community?.name.toLowerCase()}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Community
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <MessageCleanupManager
        isVisible={showCleanupManager}
        onClose={() => setShowCleanupManager(false)}
        currentUser={currentUser}
      />
    </Dialog>
  );
}