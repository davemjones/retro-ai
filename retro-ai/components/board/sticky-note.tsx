"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash, GripVertical } from "lucide-react";
import { EditStickyDialog } from "./edit-sticky-dialog";
import { EditingIndicator } from "./editing-indicator";
import { toast } from "sonner";
import { useSocket } from "@/hooks/use-socket";

interface EditingEvent {
  stickyId: string;
  userId: string;
  userName: string;
  action: 'start' | 'stop';
  timestamp: number;
}

interface StickyNoteProps {
  sticky: {
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
  };
  userId: string;
  moveIndicator?: {
    movedBy: string;
    timestamp: number;
  } | null;
}

export function StickyNote({ sticky, userId, moveIndicator: propMoveIndicator }: StickyNoteProps) {
  const router = useRouter();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingUser, setEditingUser] = useState<{ userId: string; userName: string } | null>(null);
  const [moveIndicator, setMoveIndicator] = useState<{
    movedBy: string;
    timestamp: number;
  } | null>(propMoveIndicator || null);

  // Socket integration for editing indicators
  const { emitEditingStart, emitEditingStop } = useSocket({
    onEditingStarted: useCallback((data: EditingEvent) => {
      if (data.stickyId === sticky.id && data.userId !== userId) {
        setEditingUser({ userId: data.userId, userName: data.userName });
      }
    }, [sticky.id, userId]),
    onEditingStopped: useCallback((data: EditingEvent) => {
      if (data.stickyId === sticky.id && data.userId !== userId) {
        setEditingUser(null);
      }
    }, [sticky.id, userId]),
  });

  // Update move indicator when prop changes
  useEffect(() => {
    if (propMoveIndicator) {
      setMoveIndicator(propMoveIndicator);
    }
  }, [propMoveIndicator]);

  // Timer to clear move indicator after 10 seconds
  useEffect(() => {
    if (moveIndicator) {
      const timer = setTimeout(() => {
        setMoveIndicator(null);
      }, 10000); // 10 seconds

      return () => clearTimeout(timer);
    }
  }, [moveIndicator]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: sticky.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isOwner = sticky.author.id === userId;
  const canEdit = true; // All team members can edit
  const hasBeenEditedByOthers = sticky.editors && sticky.editors.length > 0;

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this sticky note?")) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/stickies/${sticky.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete sticky note");
      }

      toast.success("Sticky note deleted");
      router.refresh();
    } catch (error) {
      console.error("Failed to delete sticky note:", error);
      toast.error("Failed to delete sticky note");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card
        ref={setNodeRef}
        style={{ ...style, backgroundColor: sticky.color }}
        className={`group cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md relative ${
          isDragging ? "shadow-lg" : ""
        }`}
        {...attributes}
      >
        {/* Editing indicator */}
        {editingUser && (
          <EditingIndicator 
            userName={editingUser.userName}
            className="z-10"
          />
        )}
        
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div
              {...listeners}
              className="flex-1 text-sm leading-relaxed break-words"
            >
              {sticky.content}
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <div {...listeners} className="cursor-grab p-1">
                <GripVertical className="h-3 w-3 text-muted-foreground" />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canEdit && (
                    <DropdownMenuItem
                      onClick={() => {
                        setShowEditDialog(true);
                        emitEditingStart(sticky.id, sticky.boardId);
                      }}
                    >
                      <Edit className="mr-2 h-3 w-3" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {isOwner && (
                    <DropdownMenuItem
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="text-destructive"
                    >
                      <Trash className="mr-2 h-3 w-3" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div className="space-y-2">
            {moveIndicator ? (
              <span className="text-xs font-medium text-primary animate-pulse-move">
                Moved by: {moveIndicator.movedBy}
              </span>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-xs">
                      {getInitials(sticky.author.name || '') || 
                       getInitials(sticky.author.email) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground">
                    {sticky.author.name || sticky.author.email}
                  </span>
                </div>
                {hasBeenEditedByOthers && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Edited by</span>
                    <div className="flex items-center gap-1">
                      {sticky.editors!.map((editor) => (
                        <Avatar key={editor.id} className="h-5 w-5">
                          <AvatarFallback className="text-xs">
                            {getInitials(editor.name || '') || 
                             getInitials(editor.email) || "U"}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <EditStickyDialog
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open);
          if (!open) {
            emitEditingStop(sticky.id, sticky.boardId);
          }
        }}
        sticky={sticky}
        onStickyUpdated={() => {
          setShowEditDialog(false);
          emitEditingStop(sticky.id, sticky.boardId);
          router.refresh();
        }}
      />
    </>
  );
}