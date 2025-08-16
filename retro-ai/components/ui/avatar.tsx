"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"

function Avatar({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "relative flex size-8 shrink-0 overflow-hidden rounded-full",
        className
      )}
      {...props}
    />
  )
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full", className)}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  color,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback> & {
  color?: string;
}) {
  const style = color 
    ? { backgroundColor: color, color: '#000000' } 
    : undefined;

  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        color ? "" : "bg-muted",
        "flex size-full items-center justify-center rounded-full",
        className
      )}
      style={style}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback }
