"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, SortableContext } from "@dnd-kit/sortable";
import { Column } from "./column";
import { CreateStickyDialog } from "./create-sticky-dialog";
import { CreateColumnDialog } from "./create-column-dialog";
import { StickyNote } from "./sticky-note";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface BoardData {
  id: string;
  title: string;
  columns: Array<{
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
  }>;
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
}

interface BoardCanvasProps {
  board: BoardData;
  columns: BoardData["columns"];
  userId: string;
}

export function BoardCanvas({ board, columns: initialColumns, userId }: BoardCanvasProps) {
  const router = useRouter();
  const [columns, setColumns] = useState(initialColumns);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCreateColumnDialog, setShowCreateColumnDialog] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const columnsMap = Object.fromEntries(columns.map((col) => [col.id, col]));

  const findContainer = useCallback((id: string): string | undefined => {
    if (id in columnsMap) {
      return id;
    }

    // Check if it's a sticky note in a column
    for (const column of columns) {
      if (column.stickies.some((sticky) => sticky.id === id)) {
        return column.id;
      }
    }

    // Check if it's a sticky note on the board
    if (board.stickies.some((sticky) => sticky.id === id)) {
      return "board";
    }

    return undefined;
  }, [columnsMap, columns, board.stickies]);

  const getItemsForContainer = useCallback((containerId: string) => {
    if (containerId === "board") {
      return board.stickies;
    }
    return columnsMap[containerId]?.stickies || [];
  }, [board.stickies, columnsMap]);

  const moveBetweenContainers = useCallback((
    columns: BoardData["columns"],
    activeContainer: string,
    overContainer: string,
    activeIndex: number,
    overIndex: number
  ) => {
    // This is a simplified version - you'd need to handle board-level stickies too
    return columns.map((column) => {
      if (column.id === activeContainer) {
        // Remove from active container
        return {
          ...column,
          stickies: column.stickies.filter((_, index) => index !== activeIndex),
        };
      } else if (column.id === overContainer) {
        // Add to over container
        const activeItem = getItemsForContainer(activeContainer)[activeIndex];
        const newStickies = [...column.stickies];
        newStickies.splice(overIndex, 0, activeItem);
        return {
          ...column,
          stickies: newStickies,
        };
      }
      return column;
    });
  }, [getItemsForContainer]);

  const findActiveSticky = useCallback(() => {
    if (!activeId) return null;
    
    // Check columns first
    for (const column of columns) {
      const sticky = column.stickies.find(s => s.id === activeId);
      if (sticky) return sticky;
    }
    
    // Check board-level stickies
    const sticky = board.stickies.find(s => s.id === activeId);
    return sticky || null;
  }, [activeId, columns, board.stickies]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find the containers
    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId) || overId;

    if (!activeContainer || !overContainer) return;
    if (activeContainer === overContainer) return;

    setColumns((columns) => {
      const activeItems = getItemsForContainer(activeContainer);
      const overItems = getItemsForContainer(overContainer);

      // Find the indexes for the items
      const activeIndex = activeItems.findIndex((item) => item.id === activeId);
      const overIndex = overItems.findIndex((item) => item.id === overId);

      let newIndex: number;
      if (overId in columnsMap) {
        // Dropping into a column
        newIndex = overItems.length + 1;
      } else {
        // Dropping over an item
        const isBelowLastItem = over && overIndex === overItems.length - 1;
        const modifier = isBelowLastItem ? 1 : 0;
        newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
      }

      return moveBetweenContainers(
        columns,
        activeContainer,
        overContainer,
        activeIndex,
        newIndex
      );
    });
  }, [columnsMap, findContainer, getItemsForContainer, moveBetweenContainers]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId) || overId;

    if (!activeContainer || !overContainer) {
      setActiveId(null);
      return;
    }

    const activeIndex = getItemsForContainer(activeContainer).findIndex(
      (item) => item.id === activeId
    );
    const overIndex = getItemsForContainer(overContainer).findIndex(
      (item) => item.id === overId
    );

    if (activeContainer === overContainer) {
      // Moving within the same container
      setColumns((columns) => {
        const columnIndex = columns.findIndex((col) => col.id === activeContainer);
        
        return columns.map((col, index) => {
          if (index === columnIndex) {
            return {
              ...col,
              stickies: arrayMove(col.stickies, activeIndex, overIndex),
            };
          }
          return col;
        });
      });
    }

    // Update backend
    try {
      const targetColumnId = overContainer === "board" ? null : overContainer;
      await fetch(`/api/stickies/${activeId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          columnId: targetColumnId,
        }),
      });
    } catch (error) {
      console.error("Failed to move sticky note:", error);
      toast.error("Failed to move sticky note");
      // Revert the change
      setColumns(initialColumns);
    }

    setActiveId(null);
  }, [findContainer, getItemsForContainer, initialColumns]);

  const activeSticky = findActiveSticky();

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="h-full p-6 bg-gradient-to-br from-background to-muted/20">
        <div className="h-full flex gap-6 overflow-x-auto">
          {/* Columns */}
          <SortableContext items={columns.map((col) => col.id)}>
            {columns.map((column) => (
              <Column
                key={column.id}
                column={column}
                userId={userId}
              />
            ))}
          </SortableContext>

          {/* Add Column Button */}
          <div className="min-w-[300px]">
            <Button
              variant="outline"
              className="w-full h-12 border-2 border-dashed"
              onClick={() => setShowCreateColumnDialog(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Column
            </Button>
          </div>
        </div>

        {/* Floating Add Button */}
        <Button
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
          size="icon"
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus className="h-6 w-6" />
        </Button>

        <CreateStickyDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          boardId={board.id}
          columns={columns}
          onStickyCreated={() => {
            setShowCreateDialog(false);
            router.refresh();
          }}
        />

        <CreateColumnDialog
          open={showCreateColumnDialog}
          onOpenChange={setShowCreateColumnDialog}
          boardId={board.id}
          onColumnCreated={() => {
            setShowCreateColumnDialog(false);
            router.refresh();
          }}
        />
      </div>

      <DragOverlay>
        {activeSticky && (
          <StickyNote
            sticky={activeSticky}
            userId={userId}
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}