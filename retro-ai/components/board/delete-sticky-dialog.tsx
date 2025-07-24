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
        throw new Error(error.error || "Failed to delete note");
      }

      // Emit WebSocket event for real-time updates
      emitStickyDeleted({
        stickyId: sticky.id,
        boardId,
      });

      // Update local state through callback
      onStickyDeleted();

      toast.success("Note deleted successfully");
      onClose();
    } catch (error) {
      console.error("Failed to delete note:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete note");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Note</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this note?
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