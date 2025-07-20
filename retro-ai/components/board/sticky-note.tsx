"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash, GripVertical } from "lucide-react";
import { EditStickyDialog } from "./edit-sticky-dialog";
import { toast } from "sonner";

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
    };
    createdAt: string;
  };
  userId: string;
}

export function StickyNote({ sticky, userId }: StickyNoteProps) {
  const router = useRouter();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
        className={`group cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md ${
          isDragging ? "shadow-lg" : ""
        }`}
        {...attributes}
      >
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
                  {isOwner && (
                    <>
                      <DropdownMenuItem
                        onClick={() => setShowEditDialog(true)}
                      >
                        <Edit className="mr-2 h-3 w-3" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="text-destructive"
                      >
                        <Trash className="mr-2 h-3 w-3" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-xs">
                  {sticky.author.name?.charAt(0).toUpperCase() || 
                   sticky.author.email.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">
                {sticky.author.name || sticky.author.email}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date(sticky.createdAt).toLocaleDateString()}
            </span>
          </div>
        </CardContent>
      </Card>

      <EditStickyDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        sticky={sticky}
        onStickyUpdated={() => {
          setShowEditDialog(false);
          router.refresh();
        }}
      />
    </>
  );
}