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
import { MoreHorizontal, Edit, Trash } from "lucide-react";
import { EditStickyDialog } from "./edit-sticky-dialog";
import { DeleteStickyDialog } from "./delete-sticky-dialog";
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<{ userId: string; userName: string } | null>(null);
  const [moveIndicator, setMoveIndicator] = useState<{
    movedBy: string;
    timestamp: number;
  } | null>(propMoveIndicator || null);

  // Socket integration for editing indicators and deletion
  const { emitEditingStart, emitEditingStop, emitStickyDeleted } = useSocket({
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


  return (
    <>
      <Card
        ref={setNodeRef}
        style={{ ...style, backgroundColor: sticky.color }}
        className={`group cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md relative py-1 ${
          isDragging ? "shadow-lg" : ""
        }`}
        {...attributes}
        {...listeners}
      >
        {/* Editing indicator */}
        {editingUser && (
          <EditingIndicator 
            userName={editingUser.userName}
            className="z-10"
          />
        )}
        
        <CardContent className="p-3 h-full flex flex-col">
          {/* Top Row: Author info (right-aligned) */}
          <div className="flex justify-end mb-2">
            {moveIndicator ? (
              <span className="text-xs font-medium text-primary animate-pulse-move">
                Moved by: {moveIndicator.movedBy}
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {sticky.author.name || sticky.author.email}
                </span>
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-xs">
                    {getInitials(sticky.author.name || '') || 
                     getInitials(sticky.author.email) || "U"}
                  </AvatarFallback>
                </Avatar>
              </div>
            )}
          </div>

          {/* Middle: Content */}
          <div className="flex-1 text-sm leading-relaxed break-words mb-2">
            {sticky.content}
          </div>

          {/* Bottom Row: Edit history and menu */}
          <div className="flex items-end justify-between">
            {/* Left: Edit history */}
            <div className="flex-1">
              {hasBeenEditedByOthers && !moveIndicator && (
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
            </div>

            {/* Right: Edit menu (always visible) */}
            <div className="flex items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-70 hover:opacity-100"
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
                      onClick={() => setShowDeleteDialog(true)}
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
          // Note: No router.refresh() - let WebSocket handle real-time updates
        }}
      />

      <DeleteStickyDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        sticky={sticky}
        boardId={sticky.boardId}
        onStickyDeleted={() => {
          setShowDeleteDialog(false);
          // Note: No router.refresh() - let WebSocket handle real-time updates
        }}
        emitStickyDeleted={emitStickyDeleted}
      />
    </>
  );
}