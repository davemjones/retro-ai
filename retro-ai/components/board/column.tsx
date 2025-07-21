"use client";

import { useState, useEffect, useRef } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { StickyNote } from "./sticky-note";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { useSocket } from "@/hooks/use-socket";

interface ColumnProps {
  column: {
    id: string;
    title: string;
    order: number;
    color?: string | null;
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
      createdAt: Date;
      updatedAt: Date;
      boardId: string;
      columnId: string | null;
      authorId: string;
    }>;
  };
  userId: string;
  boardId: string;
  isOwner: boolean;
  moveIndicators?: Record<string, { movedBy: string; timestamp: number }>;
  onColumnRenamed?: (columnId: string, newTitle: string) => void;
}

export function Column({ column, userId, boardId, isOwner, moveIndicators, onColumnRenamed }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(column.title);
  const [isSaving, setIsSaving] = useState(false);
  const [showPencil, setShowPencil] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { emitColumnRenamed } = useSocket({
    boardId,
  });

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    const trimmedTitle = editTitle.trim();
    
    if (!trimmedTitle) {
      toast.error("Column title cannot be empty");
      setEditTitle(column.title);
      setIsEditing(false);
      return;
    }

    if (trimmedTitle === column.title) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/columns/${column.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: trimmedTitle }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to rename column");
      }

      // Emit WebSocket event for real-time updates
      emitColumnRenamed({
        columnId: column.id,
        title: trimmedTitle,
        boardId,
      });

      // Update local state through callback
      onColumnRenamed?.(column.id, trimmedTitle);

      toast.success("Column renamed successfully");
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to rename column:", error);
      toast.error(error instanceof Error ? error.message : "Failed to rename column");
      setEditTitle(column.title);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      setEditTitle(column.title);
      setIsEditing(false);
    }
  };

  return (
    <Card
      ref={setNodeRef}
      className={`min-w-[300px] max-w-[300px] h-fit max-h-[calc(100vh-12rem)] flex flex-col ${
        isOver ? "ring-2 ring-primary" : ""
      }`}
    >
      <CardHeader 
        className="pb-3"
        onMouseEnter={() => isOwner && setShowPencil(true)}
        onMouseLeave={() => isOwner && setShowPencil(false)}
      >
        <div className="flex items-center justify-between">
          {isEditing ? (
            <Input
              ref={inputRef}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              disabled={isSaving}
              className="text-lg font-semibold h-auto py-0 px-1"
              style={{ color: column.color || undefined }}
            />
          ) : (
            <div className="flex items-center gap-2 flex-1">
              <CardTitle
                className="text-lg cursor-text"
                style={{ color: column.color || undefined }}
                onClick={() => isOwner && setIsEditing(true)}
              >
                {column.title}
              </CardTitle>
              {isOwner && showPencil && (
                <Pencil 
                  className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  onClick={() => setIsEditing(true)}
                />
              )}
            </div>
          )}
          <Badge variant="secondary">{column.stickies.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-3 space-y-3">
        <SortableContext
          items={column.stickies.map((sticky) => sticky.id)}
          strategy={verticalListSortingStrategy}
        >
          {column.stickies.map((sticky) => (
            <StickyNote
              key={sticky.id}
              sticky={sticky}
              userId={userId}
              moveIndicator={moveIndicators?.[sticky.id] || null}
            />
          ))}
        </SortableContext>
        {column.stickies.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Drop sticky notes here
          </div>
        )}
      </CardContent>
    </Card>
  );
}