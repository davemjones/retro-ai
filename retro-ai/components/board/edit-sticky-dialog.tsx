"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useSocket } from "@/hooks/use-socket";

const STICKY_COLORS = [
  { name: "Yellow", value: "#FFE066" },
  { name: "Pink", value: "#FF6B9D" },
  { name: "Blue", value: "#4ECDC4" },
  { name: "Green", value: "#95E1D3" },
  { name: "Orange", value: "#FFA07A" },
  { name: "Purple", value: "#C3A6FF" },
];

interface EditStickyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sticky: {
    id: string;
    content: string;
    color: string;
    boardId: string;
    editedBy: string[];
    editors?: {
      id: string;
      name: string | null;
      email: string;
    }[];
  };
  onStickyUpdated: () => void;
}

export function EditStickyDialog({
  open,
  onOpenChange,
  sticky,
  onStickyUpdated,
}: EditStickyDialogProps) {
  const [content, setContent] = useState("");
  const [color, setColor] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { emitStickyUpdated } = useSocket();

  useEffect(() => {
    if (open) {
      setContent(sticky.content);
      setColor(sticky.color);
    }
  }, [open, sticky]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      toast.error("Please enter some content");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/stickies/${sticky.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: content.trim(),
          color,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update note");
      }

      // Emit WebSocket event for real-time updates
      emitStickyUpdated({
        stickyId: sticky.id,
        content: content.trim(),
        color,
        boardId: sticky.boardId,
        editedBy: data.sticky.editedBy || sticky.editedBy,
        editors: data.sticky.editors || sticky.editors,
      });

      toast.success("Note updated!");
      onOpenChange(false);
      onStickyUpdated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Note</DialogTitle>
          <DialogDescription>
            Update the content and color of your note
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              disabled={isLoading}
              rows={4}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Color</Label>
            <div className="grid grid-cols-6 gap-2">
              {STICKY_COLORS.map((colorOption) => (
                <button
                  key={colorOption.value}
                  type="button"
                  className={`h-8 w-8 rounded-full border-2 transition-all ${
                    color === colorOption.value
                      ? "border-foreground scale-110"
                      : "border-border hover:scale-105"
                  }`}
                  style={{ backgroundColor: colorOption.value }}
                  onClick={() => setColor(colorOption.value)}
                  title={colorOption.name}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Updating..." : "Update Note"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}