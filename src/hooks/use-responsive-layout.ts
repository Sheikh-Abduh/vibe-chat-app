"use client";

import { useState, useEffect } from 'react';

export type ScreenSize = 'mobile' | 'tablet' | 'desktop';
export type Orientation = 'portrait' | 'landscape';

interface ResponsiveLayout {
  screenSize: ScreenSize;
  orientation: Orientation;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isPortrait: boolean;
  isLandscape: boolean;
  width: number;
  height: number;
}

export function useResponsiveLayout(): ResponsiveLayout {
  const [layout, setLayout] = useState<ResponsiveLayout>({
    screenSize: 'desktop',
    orientation: 'landscape',
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isPortrait: false,
    isLandscape: true,
    width: 1024,
    height: 768,
  });

  useEffect(() => {
    const updateLayout = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // Determine screen size based on width
      let screenSize: ScreenSize = 'desktop';
      if (width < 640) {
        screenSize = 'mobile';
      } else if (width < 1024) {
        screenSize = 'tablet';
      }
      
      // Determine orientation
      const orientation: Orientation = width > height ? 'landscape' : 'portrait';
      
      setLayout({
        screenSize,
        orientation,
        isMobile: screenSize === 'mobile',
        isTablet: screenSize === 'tablet',
        isDesktop: screenSize === 'desktop',
        isPortrait: orientation === 'portrait',
        isLandscape: orientation === 'landscape',
        width,
        height,
      });
    };

    // Initial update
    updateLayout();

    // Listen for resize events
    window.addEventListener('resize', updateLayout);
    window.addEventListener('orientationchange', updateLayout);

    return () => {
      window.removeEventListener('resize', updateLayout);
      window.removeEventListener('orientationchange', updateLayout);
    };
  }, []);

  return layout;
}

// Helper hook for call-specific responsive behavior
export function useCallResponsiveLayout() {
  const layout = useResponsiveLayout();
  
  return {
    ...layout,
    // Call-specific responsive properties
    buttonSize: layout.isMobile ? 'sm' : layout.isTablet ? 'md' : 'lg',
    avatarSize: layout.isMobile ? 'sm' : layout.isTablet ? 'md' : 'lg',
    textSize: layout.isMobile ? 'sm' : layout.isTablet ? 'md' : 'lg',
    spacing: layout.isMobile ? 'sm' : layout.isTablet ? 'md' : 'lg',
    padding: layout.isMobile ? 'sm' : layout.isTablet ? 'md' : 'lg',
    
    // Video layout properties
    shouldUseCompactLayout: layout.isMobile || (layout.isLandscape && layout.height < 500),
    shouldShowLabels: !layout.isMobile || layout.isLandscape,
    maxParticipantsPerRow: layout.isMobile ? 2 : layout.isTablet ? 3 : 4,
    
    // Control layout properties
    shouldStackControls: layout.isMobile && layout.isPortrait,
    shouldShowTooltips: !layout.isMobile,
    controlsPosition: layout.isMobile ? 'bottom' : 'center',
  };
}