"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface CreateColumnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId: string;
  onColumnCreated: () => void;
}

const COLUMN_COLORS = [
  { value: "#ef4444", label: "Red", name: "red" },
  { value: "#f97316", label: "Orange", name: "orange" },
  { value: "#eab308", label: "Yellow", name: "yellow" },
  { value: "#22c55e", label: "Green", name: "green" },
  { value: "#3b82f6", label: "Blue", name: "blue" },
  { value: "#8b5cf6", label: "Purple", name: "purple" },
  { value: "#ec4899", label: "Pink", name: "pink" },
  { value: "#6b7280", label: "Gray", name: "gray" },
];

export function CreateColumnDialog({
  open,
  onOpenChange,
  boardId,
  onColumnCreated,
}: CreateColumnDialogProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [color, setColor] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error("Please enter a column title");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/columns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          boardId,
          color: color || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create column");
      }

      toast.success("Column created successfully!");
      setTitle("");
      setColor("");
      onColumnCreated();
      router.refresh();
    } catch (error) {
      console.error("Failed to create column:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create column");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setTitle("");
      setColor("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Column</DialogTitle>
          <DialogDescription>
            Create a new column for organizing sticky notes on your board.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Column Title</Label>
            <Input
              id="title"
              placeholder="e.g., What went well?, To improve, Action items"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="color">Color (Optional)</Label>
            <Select value={color} onValueChange={setColor} disabled={isSubmitting}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a color" />
              </SelectTrigger>
              <SelectContent>
                {COLUMN_COLORS.map((colorOption) => (
                  <SelectItem key={colorOption.value} value={colorOption.value}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full border"
                        style={{ backgroundColor: colorOption.value }}
                      />
                      {colorOption.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Column"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}