"use client";

import { useState, useCallback, useRef } from "react";
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
import { UnassignedArea } from "./unassigned-area";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useSocket } from "@/hooks/use-socket";

interface MovementEvent {
  stickyId: string;
  columnId: string | null;
  positionX?: number;
  positionY?: number;
  boardId?: string;
  userId: string;
  userName?: string;
  timestamp: number;
}

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
  const [unassignedStickies, setUnassignedStickies] = useState(board.stickies);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCreateColumnDialog, setShowCreateColumnDialog] = useState(false);
  const [moveIndicators, setMoveIndicators] = useState<Record<string, { movedBy: string; timestamp: number }>>({});
  
  // Track if we initiated the movement to prevent echo
  const isLocalMovement = useRef(false);

  // Socket integration for real-time collaboration
  const { isConnected, emitStickyMoved } = useSocket({
    boardId: board.id,
    onStickyMoved: useCallback((data: MovementEvent) => {
      // Only update if this movement wasn't initiated by us
      if (isLocalMovement.current || data.userId === userId) {
        return;
      }

      console.log("Received movement event:", data);

      // Find the sticky note that's being moved
      let movedSticky = null;
      
      // Check columns first
      for (const column of columns) {
        const sticky = column.stickies.find(s => s.id === data.stickyId);
        if (sticky) {
          movedSticky = sticky;
          break;
        }
      }
      
      // Check unassigned if not found in columns
      if (!movedSticky) {
        movedSticky = unassignedStickies.find(s => s.id === data.stickyId);
      }
      
      // If we can't find the sticky, we need to refresh to get the latest data
      if (!movedSticky) {
        console.log("Sticky not found locally, refreshing...");
        setTimeout(() => router.refresh(), 0);
        return;
      }

      // Set move indicator for this sticky
      if (data.userName) {
        setMoveIndicators(prev => ({
          ...prev,
          [data.stickyId]: {
            movedBy: data.userName,
            timestamp: Date.now()
          }
        }));
      }

      // Update local state based on the movement
      if (data.columnId === null) {
        // Moving to unassigned area
        setColumns(prevColumns => 
          prevColumns.map(column => ({
            ...column,
            stickies: column.stickies.filter(sticky => sticky.id !== data.stickyId),
          }))
        );
        
        // Add to unassigned
        setUnassignedStickies(prev => {
          // Don't add if already exists
          if (prev.some(s => s.id === data.stickyId)) {
            return prev;
          }
          return [...prev, movedSticky];
        });
      } else {
        // Moving to a column
        setUnassignedStickies(prev => 
          prev.filter(sticky => sticky.id !== data.stickyId)
        );
        
        setColumns(prevColumns => 
          prevColumns.map(column => {
            if (column.id === data.columnId) {
              // Add to target column if not already there
              if (column.stickies.some(s => s.id === data.stickyId)) {
                return column;
              }
              return {
                ...column,
                stickies: [...column.stickies, movedSticky],
              };
            }
            // Remove from other columns
            return {
              ...column,
              stickies: column.stickies.filter(sticky => sticky.id !== data.stickyId),
            };
          })
        );
      }
    }, [userId, router, columns, unassignedStickies]),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const columnsMap = Object.fromEntries(columns.map((col) => [col.id, col]));

  const findContainer = useCallback((id: string): string | undefined => {
    // Check if it's the unassigned container
    if (id === "unassigned") {
      return "unassigned";
    }

    // Check if it's a column
    if (id in columnsMap) {
      return id;
    }

    // Check if it's a sticky note in a column
    for (const column of columns) {
      if (column.stickies.some((sticky) => sticky.id === id)) {
        return column.id;
      }
    }

    // Check if it's an unassigned sticky note
    if (unassignedStickies.some((sticky) => sticky.id === id)) {
      return "unassigned";
    }

    return undefined;
  }, [columnsMap, columns, unassignedStickies]);

  const getItemsForContainer = useCallback((containerId: string) => {
    if (containerId === "unassigned") {
      return unassignedStickies;
    }
    return columnsMap[containerId]?.stickies || [];
  }, [unassignedStickies, columnsMap]);


  const findActiveSticky = useCallback(() => {
    if (!activeId) return null;
    
    // Check columns first
    for (const column of columns) {
      const sticky = column.stickies.find(s => s.id === activeId);
      if (sticky) return sticky;
    }
    
    // Check unassigned stickies
    const sticky = unassignedStickies.find(s => s.id === activeId);
    return sticky || null;
  }, [activeId, columns, unassignedStickies]);

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

    // Find the active item
    const activeItems = getItemsForContainer(activeContainer);
    const activeIndex = activeItems.findIndex((item) => item.id === activeId);
    const activeItem = activeItems[activeIndex];

    if (!activeItem) return;

    // Handle moves involving unassigned area
    if (activeContainer === "unassigned" && overContainer !== "unassigned") {
      // Moving from unassigned to a column
      setUnassignedStickies((stickies) => 
        stickies.filter((sticky) => sticky.id !== activeId)
      );
      
      setColumns((columns) => 
        columns.map((column) => {
          if (column.id === overContainer) {
            const newStickies = [...column.stickies];
            const overItems = getItemsForContainer(overContainer);
            const overIndex = overItems.findIndex((item) => item.id === overId);
            
            let newIndex: number;
            if (overId === overContainer) {
              newIndex = overItems.length;
            } else {
              const isBelowLastItem = over && overIndex === overItems.length - 1;
              const modifier = isBelowLastItem ? 1 : 0;
              newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length;
            }
            
            newStickies.splice(newIndex, 0, activeItem);
            return { ...column, stickies: newStickies };
          }
          return column;
        })
      );
    } else if (activeContainer !== "unassigned" && overContainer === "unassigned") {
      // Moving from a column to unassigned
      setColumns((columns) =>
        columns.map((column) => {
          if (column.id === activeContainer) {
            return {
              ...column,
              stickies: column.stickies.filter((sticky) => sticky.id !== activeId),
            };
          }
          return column;
        })
      );
      
      setUnassignedStickies((stickies) => [...stickies, activeItem]);
    } else {
      // Moving between columns (existing logic)
      setColumns((columns) => {
        const activeColumn = columns.find((col) => col.id === activeContainer);
        const overColumn = columns.find((col) => col.id === overContainer);
        
        if (!activeColumn || !overColumn) return columns;
        
        return columns.map((column) => {
          if (column.id === activeContainer) {
            // Remove from active container
            return {
              ...column,
              stickies: column.stickies.filter((_, index) => index !== activeIndex),
            };
          } else if (column.id === overContainer) {
            // Add to over container
            const newStickies = [...column.stickies];
            const overItems = getItemsForContainer(overContainer);
            const overIndex = overItems.findIndex((item) => item.id === overId);
            
            let newIndex: number;
            if (overId === overContainer) {
              newIndex = overItems.length;
            } else {
              const isBelowLastItem = over && overIndex === overItems.length - 1;
              const modifier = isBelowLastItem ? 1 : 0;
              newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length;
            }
            
            newStickies.splice(newIndex, 0, activeItem);
            return { ...column, stickies: newStickies };
          }
          return column;
        });
      });
    }
  }, [findContainer, getItemsForContainer]);

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
      // Mark this as a local movement to prevent echo
      isLocalMovement.current = true;
      
      const targetColumnId = overContainer === "unassigned" ? null : overContainer;
      const response = await fetch(`/api/stickies/${activeId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          columnId: targetColumnId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update sticky note");
      }

      // Emit socket event after successful API call
      if (isConnected) {
        emitStickyMoved({
          stickyId: activeId,
          columnId: targetColumnId,
          boardId: board.id,
        });
        console.log("Emitted movement event:", { stickyId: activeId, columnId: targetColumnId, boardId: board.id });
      }
      
      // Refresh to update the UI
      router.refresh();
    } catch (error) {
      console.error("Failed to move sticky note:", error);
      toast.error("Failed to move sticky note");
      // Revert the change
      setColumns(initialColumns);
      setUnassignedStickies(board.stickies);
    } finally {
      // Reset the local movement flag after a short delay
      setTimeout(() => {
        isLocalMovement.current = false;
      }, 100);
    }

    setActiveId(null);
  }, [findContainer, getItemsForContainer, initialColumns, router, isConnected, emitStickyMoved, board.stickies, board.id]);

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
          {/* Unassigned Area */}
          <UnassignedArea
            stickies={unassignedStickies}
            userId={userId}
            moveIndicators={moveIndicators}
          />

          {/* Columns */}
          <SortableContext items={columns.map((col) => col.id)}>
            {columns.map((column) => (
              <Column
                key={column.id}
                column={column}
                userId={userId}
                moveIndicators={moveIndicators}
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