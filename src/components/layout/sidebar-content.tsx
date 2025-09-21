"use client";

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  SidebarContent, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton 
} from '@/components/ui/sidebar';
import { 
  LayoutDashboard, 
  Compass, 
  MessageSquare, 
  Settings, 
  Users
} from 'lucide-react';

export const AppSidebarContent: React.FC = React.memo(() => {
  const pathname = usePathname();

  // Memoize active states to prevent recalculation on every render
  const activeStates = useMemo(() => ({
    dashboard: pathname === '/dashboard',
    discover: pathname === '/discover',
    communities: pathname === '/communities',
    messages: pathname.startsWith('/messages'),
    settings: pathname.startsWith('/settings')
  }), [pathname]);

  return (
    <SidebarContent className="px-2 pt-6 pb-2">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild isActive={activeStates.dashboard}>
            <Link href="/dashboard">
              <LayoutDashboard />
              Dashboard
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton asChild isActive={activeStates.discover}>
            <Link href="/discover">
              <Compass />
              Discover
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton asChild isActive={activeStates.communities}>
            <Link href="/communities">
              <Users />
              Communities
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton asChild isActive={activeStates.messages}>
            <Link href="/messages">
              <MessageSquare />
              Messages
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton asChild isActive={activeStates.settings}>
            <Link href="/settings">
              <Settings />
              Settings
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarContent>
  );
});

AppSidebarContent.displayName = 'AppSidebarContent';

export default AppSidebarContent;