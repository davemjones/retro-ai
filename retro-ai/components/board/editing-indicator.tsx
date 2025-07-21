"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

interface EditingIndicatorProps {
  userName: string;
  className?: string;
}

export function EditingIndicator({ userName, className = "" }: EditingIndicatorProps) {
  const initials = getInitials(userName) || "?";

  return (
    <div className={`absolute bottom-1 right-1 flex items-center gap-1 ${className}`}>
      {/* User avatar */}
      <Avatar className="h-4 w-4 border border-white">
        <AvatarFallback className="text-xs bg-gray-600 text-white">
          {initials}
        </AvatarFallback>
      </Avatar>
      
      {/* Pulsating dots */}
      <div className="flex items-center gap-0.5">
        <div className="w-1 h-1 bg-gray-600 rounded-full animate-pulse delay-0"></div>
        <div className="w-1 h-1 bg-gray-600 rounded-full animate-pulse delay-75"></div>
        <div className="w-1 h-1 bg-gray-600 rounded-full animate-pulse delay-150"></div>
      </div>
    </div>
  );
}