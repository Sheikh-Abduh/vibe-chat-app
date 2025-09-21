"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// Safe tooltip implementation that doesn't use Radix UI's DismissableLayer
// This prevents the infinite loop issues we're experiencing

interface SafeTooltipProps {
  children: React.ReactNode
  content: string
  side?: "top" | "bottom" | "left" | "right"
  disabled?: boolean
}

export const SafeTooltip: React.FC<SafeTooltipProps> = ({ 
  children, 
  content, 
  side = "right",
  disabled = false 
}) => {
  const [isVisible, setIsVisible] = React.useState(false)
  const [position, setPosition] = React.useState({ x: 0, y: 0 })
  const triggerRef = React.useRef<HTMLDivElement>(null)

  const handleMouseEnter = React.useCallback((e: React.MouseEvent) => {
    if (disabled) return
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    let x = 0
    let y = 0

    switch (side) {
      case "right":
        x = rect.right + 8
        y = rect.top + rect.height / 2
        break
      case "left":
        x = rect.left - 8
        y = rect.top + rect.height / 2
        break
      case "top":
        x = rect.left + rect.width / 2
        y = rect.top - 8
        break
      case "bottom":
        x = rect.left + rect.width / 2
        y = rect.bottom + 8
        break
    }

    setPosition({ x, y })
    setIsVisible(true)
  }, [disabled, side])

  const handleMouseLeave = React.useCallback(() => {
    setIsVisible(false)
  }, [])

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-block"
      >
        {children}
      </div>
      {isVisible && (
        <div
          className={cn(
            "fixed z-50 px-2 py-1 text-xs bg-popover text-popover-foreground border rounded-md shadow-md pointer-events-none",
            side === "right" && "transform -translate-y-1/2",
            side === "left" && "transform -translate-x-full -translate-y-1/2",
            side === "top" && "transform -translate-x-1/2 -translate-y-full",
            side === "bottom" && "transform -translate-x-1/2"
          )}
          style={{
            left: position.x,
            top: position.y,
          }}
        >
          {content}
        </div>
      )}
    </>
  )
}

export default SafeTooltip