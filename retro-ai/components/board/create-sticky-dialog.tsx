"use client";

import { useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const STICKY_COLORS = [
  { name: "Yellow", value: "#FFE066" },
  { name: "Pink", value: "#FF6B9D" },
  { name: "Blue", value: "#4ECDC4" },
  { name: "Green", value: "#95E1D3" },
  { name: "Orange", value: "#FFA07A" },
  { name: "Purple", value: "#C3A6FF" },
];

interface CreateStickyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId: string;
  columns: Array<{
    id: string;
    title: string;
  }>;
  onStickyCreated: () => void;
}

export function CreateStickyDialog({
  open,
  onOpenChange,
  boardId,
  columns,
  onStickyCreated,
}: CreateStickyDialogProps) {
  const [content, setContent] = useState("");
  const [color, setColor] = useState(STICKY_COLORS[0].value);
  const [columnId, setColumnId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      toast.error("Please enter some content");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/stickies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: content.trim(),
          color,
          boardId,
          columnId: columnId === "free-placement" ? null : columnId || null,
          positionX: Math.random() * 100,
          positionY: Math.random() * 100,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create sticky note");
      }

      toast.success("Sticky note created!");
      setContent("");
      setColor(STICKY_COLORS[0].value);
      setColumnId(undefined);
      onOpenChange(false);
      onStickyCreated();
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
          <DialogTitle>Add Sticky Note</DialogTitle>
          <DialogDescription>
            Create a new sticky note for this board
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

          <div className="space-y-2">
            <Label htmlFor="column">Column (Optional)</Label>
            <Select value={columnId} onValueChange={setColumnId}>
              <SelectTrigger>
                <SelectValue placeholder="Place on board or select column" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free-placement">Free placement on board</SelectItem>
                {columns.map((column) => (
                  <SelectItem key={column.id} value={column.id}>
                    {column.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              {isLoading ? "Creating..." : "Create Sticky"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}