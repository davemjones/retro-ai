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

interface DeleteColumnDialogProps {
  isOpen: boolean;
  onClose: () => void;
  column: {
    id: string;
    title: string;
    stickies: Array<{ id: string }>;
  };
  boardId: string;
  onColumnDeleted: (columnId: string, migratedStickiesCount: number) => void;
  emitColumnDeleted: (data: { columnId: string; boardId: string }) => void;
}

export function DeleteColumnDialog({
  isOpen,
  onClose,
  column,
  boardId,
  onColumnDeleted,
  emitColumnDeleted,
}: DeleteColumnDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/columns/${column.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete column");
      }

      const result = await response.json();

      // Emit WebSocket event for real-time updates
      emitColumnDeleted({
        columnId: column.id,
        boardId,
      });

      // Update local state through callback
      onColumnDeleted(column.id, result.migratedStickiesCount);

      toast.success(
        result.migratedStickiesCount > 0
          ? `Column deleted and ${result.migratedStickiesCount} sticky notes moved to unassigned notes area`
          : "Column deleted successfully"
      );

      onClose();
    } catch (error) {
      console.error("Failed to delete column:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete column");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Column</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the column &quot;{column.title}&quot;?
            {column.stickies.length > 0 && (
              <>
                <br />
                <br />
                This column contains {column.stickies.length} sticky note
                {column.stickies.length === 1 ? "" : "s"}. All notes will be moved
                to the unassigned notes area and can be reassigned later.
              </>
            )}
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
            {isDeleting ? "Deleting..." : "Delete Column"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}