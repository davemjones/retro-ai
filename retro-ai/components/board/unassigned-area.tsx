"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { StickyNote } from "./sticky-note";
import { cn } from "@/lib/utils";
import { Inbox } from "lucide-react";

interface UnassignedAreaProps {
  stickies: Array<{
    id: string;
    content: string;
    color: string;
    positionX: number;
    positionY: number;
    author: {
      id: string;
      name: string | null;
      email: string;
      password: string;
      createdAt: Date;
      updatedAt: Date;
    };
    editedBy: string[];
    editors?: {
      id: string;
      name: string | null;
      email: string;
    }[];
    createdAt: Date;
    updatedAt: Date;
    boardId: string;
    columnId: string | null;
    authorId: string;
  }>;
  userId: string;
  moveIndicators?: Record<string, { movedBy: string; timestamp: number }>;
}

export function UnassignedArea({ stickies, userId, moveIndicators }: UnassignedAreaProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: "unassigned",
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-w-[300px] bg-muted/30 rounded-lg border-2 border-dashed transition-colors",
        isOver ? "border-primary bg-primary/10" : "border-muted-foreground/30"
      )}
    >
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Inbox className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold text-muted-foreground">
            Unassigned Notes
          </h3>
          <span className="ml-auto text-sm text-muted-foreground bg-muted px-2 py-1 rounded-full">
            {stickies.length}
          </span>
        </div>
        
        {stickies.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No unassigned notes</p>
            <p className="text-xs mt-1">
              Create notes without a column assignment
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <SortableContext
              items={stickies.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              {stickies.map((sticky) => (
                <StickyNote
                  key={sticky.id}
                  sticky={sticky}
                  userId={userId}
                  moveIndicator={moveIndicators?.[sticky.id] || null}
                />
              ))}
            </SortableContext>
          </div>
        )}
      </div>
    </div>
  );
}