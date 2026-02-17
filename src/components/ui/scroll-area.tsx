"use client"

import * as React from "react"
import { ScrollArea as ScrollAreaBase } from "@base-ui-components/react/scroll-area"

import { cn } from "@/lib/utils"

const ScrollArea = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaBase.Root
    ref={ref}
    className={cn("relative overflow-hidden", className)}
    {...props}
  >
    <ScrollAreaBase.Viewport className="h-full w-full rounded-[inherit]">
      {children}
    </ScrollAreaBase.Viewport>
    <ScrollBar />
    <ScrollAreaBase.Corner />
  </ScrollAreaBase.Root>
))
ScrollArea.displayName = "ScrollArea"

const ScrollBar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    orientation?: "vertical" | "horizontal"
  }
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaBase.Scrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" &&
        "h-full w-2.5 border-l border-l-transparent p-[1px]",
      orientation === "horizontal" &&
        "h-2.5 flex-col border-t border-t-transparent p-[1px]",
      className
    )}
    {...props}
  >
    <ScrollAreaBase.Thumb className="relative flex-1 rounded-full bg-border" />
  </ScrollAreaBase.Scrollbar>
))
ScrollBar.displayName = "ScrollBar"

export { ScrollArea, ScrollBar }
