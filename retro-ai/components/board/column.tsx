"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { StickyNote } from "./sticky-note";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ColumnProps {
  column: {
    id: string;
    title: string;
    order: number;
    color?: string;
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
      };
      createdAt: string;
    }>;
  };
  boardId: string;
  userId: string;
}

export function Column({ column, boardId, userId }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <Card
      ref={setNodeRef}
      className={`min-w-[300px] max-w-[300px] h-fit max-h-[calc(100vh-12rem)] flex flex-col ${
        isOver ? "ring-2 ring-primary" : ""
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle
            className="text-lg"
            style={{ color: column.color }}
          >
            {column.title}
          </CardTitle>
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
              boardId={boardId}
              userId={userId}
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