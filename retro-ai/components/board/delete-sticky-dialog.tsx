"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface DeleteStickyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sticky: {
    id: string;
    content: string;
    author: {
      id: string;
      name: string | null;
      email: string;
    };
  };
  boardId: string;
  onStickyDeleted: () => void;
  emitStickyDeleted: (data: { stickyId: string; boardId: string }) => void;
}

export function DeleteStickyDialog({
  isOpen,
  onClose,
  sticky,
  boardId,
  onStickyDeleted,
  emitStickyDeleted,
}: DeleteStickyDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/stickies/${sticky.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete sticky note");
      }

      // Emit WebSocket event for real-time updates
      emitStickyDeleted({
        stickyId: sticky.id,
        boardId,
      });

      // Update local state through callback
      onStickyDeleted();

      toast.success("Sticky note deleted successfully");
      onClose();
    } catch (error) {
      console.error("Failed to delete sticky note:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete sticky note");
    } finally {
      setIsDeleting(false);
    }
  };

  // Truncate content for display (max 50 characters)
  const displayContent = sticky.content.length > 50 
    ? sticky.content.substring(0, 50) + "..." 
    : sticky.content;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Sticky Note</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this sticky note?
            <br />
            <br />
            <strong>Content:</strong> "{displayContent}"
            <br />
            <strong>Author:</strong> {sticky.author.name || sticky.author.email}
            <br />
            <br />
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Note"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}