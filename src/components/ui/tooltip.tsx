"use client"

import * as React from "react"
import { Tooltip as TooltipBase } from "@base-ui-components/react/tooltip"

import { cn } from "@/lib/utils"

const TooltipProvider = TooltipBase.Provider

const Tooltip = TooltipBase.Root

interface TooltipTriggerProps {
  asChild?: boolean
  children: React.ReactNode
  [key: string]: unknown
}

const TooltipTrigger = React.forwardRef<HTMLButtonElement, TooltipTriggerProps>(
  ({ asChild, children, ...props }, ref) => {
    if (asChild && React.isValidElement(children)) {
      return (
        <TooltipBase.Trigger ref={ref} render={children as React.ReactElement} {...props} />
      )
    }
    return (
      <TooltipBase.Trigger ref={ref} {...props}>
        {children}
      </TooltipBase.Trigger>
    )
  }
)
TooltipTrigger.displayName = "TooltipTrigger"

const TooltipContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    sideOffset?: number
    side?: "top" | "bottom" | "left" | "right"
  }
>(({ className, sideOffset = 4, side, ...props }, ref) => (
  <TooltipBase.Portal>
    <TooltipBase.Positioner sideOffset={sideOffset} side={side}>
      <TooltipBase.Popup
        ref={ref}
        className={cn(
          "z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95",
          className
        )}
        {...props}
      />
    </TooltipBase.Positioner>
  </TooltipBase.Portal>
))
TooltipContent.displayName = "TooltipContent"

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
