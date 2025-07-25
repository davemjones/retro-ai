"use client";

import { useState, useCallback, useRef } from "react";
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
import { CreateColumnDialog } from "./create-column-dialog";
import { StickyNote } from "./sticky-note";
import { UnassignedArea } from "./unassigned-area";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useSocket } from "@/hooks/use-socket";
import { animateStickyEntering } from "@/lib/animation-utils";
import { useFlipAnimation } from "@/hooks/use-flip-animation";

interface MovementEvent {
  stickyId: string;
  columnId: string | null;
  positionX?: number;
  positionY?: number;
  order?: number;
  boardId?: string;
  userId: string;
  userName?: string;
  timestamp: number;
}

interface ColumnRenameEvent {
  columnId: string;
  title: string;
  boardId: string;
  userId: string;
  timestamp: number;
}

interface ColumnDeleteEvent {
  columnId: string;
  boardId: string;
  userId: string;
  timestamp: number;
}

interface StickyDeleteEvent {
  stickyId: string;
  boardId: string;
  userId: string;
  timestamp: number;
}

interface StickyUpdateEvent {
  stickyId: string;
  content?: string;
  color?: string;
  boardId: string;
  userId: string;
  editedBy: string[];
  editors?: {
    id: string;
    name: string | null;
    email: string;
  }[];
  timestamp: number;
}

interface StickyCreateEvent {
  stickyId: string;
  content: string;
  color: string;
  boardId: string;
  columnId: string | null;
  positionX: number;
  positionY: number;
  author: {
    id: string;
    name: string | null;
    email: string;
  };
  userId: string;
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
      order: number;
      author: {
        id: string;
        name: string | null;
        email: string;
        password: string;
        createdAt: Date;
        updatedAt: Date;
      };
      editedBy: string[];
      editors?: {
        id: string;
        name: string | null;
        email: string;
      }[];
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
    order: number;
    author: {
      id: string;
      name: string | null;
      email: string;
      password: string;
      createdAt: Date;
      updatedAt: Date;
    };
    editedBy: string[];
    editors?: {
      id: string;
      name: string | null;
      email: string;
    }[];
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
  isOwner: boolean;
}

export function BoardCanvas({ board, columns: initialColumns, userId, isOwner }: BoardCanvasProps) {
  const [columns, setColumns] = useState(initialColumns);
  const [unassignedStickies, setUnassignedStickies] = useState(board.stickies);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showCreateColumnDialog, setShowCreateColumnDialog] = useState(false);
  const [moveIndicators, setMoveIndicators] = useState<Record<string, { movedBy: string; timestamp: number }>>({});
  
  // Track if we initiated the movement to prevent echo
  const isLocalMovement = useRef(false);
  
  // Removed animatingStickies state - now using flipAnimation.isAnimating()
  
  // FLIP animation hook for smooth remote movements
  const flipAnimation = useFlipAnimation({ enabled: true, duration: 300 });

  // Socket integration for real-time collaboration
  const { isConnected, emitStickyMoved } = useSocket({
    boardId: board.id,
    onStickyMoved: useCallback((data: MovementEvent) => {
      // Only update if this movement wasn't initiated by us
      if (isLocalMovement.current || data.userId === userId) {
        return;
      }

      // Skip if already animating this sticky to prevent conflicts
      if (flipAnimation.isAnimating(data.stickyId)) {
        return;
      }

      // Set move indicator for this sticky
      if (data.userName) {
        setMoveIndicators(prev => ({
          ...prev,
          [data.stickyId]: {
            movedBy: data.userName!,
            timestamp: Date.now()
          }
        }));
      }

      // FLIP Animation: Record position, update state, then animate
      flipAnimation.animateMovement(data.stickyId, () => {
        // Find and update the sticky using functional setState to avoid stale closures
        
        if (data.columnId === null) {
          // Moving to unassigned area (could be from column or within unassigned)
          
          // Check if it's already in unassigned (reordering) or if we need to move from column
          setUnassignedStickies(prevUnassigned => {
            const existingIndex = prevUnassigned.findIndex(s => s.id === data.stickyId);
            
            if (existingIndex !== -1) {
              // Sticky is already in unassigned - this is a reorder within unassigned
              const stickyToReorder = { ...prevUnassigned[existingIndex] };
              // Update order if provided
              if (data.order !== undefined) {
                stickyToReorder.order = data.order;
              }
              // Remove from current position and add with new order
              const filtered = prevUnassigned.filter(s => s.id !== data.stickyId);
              const result = [...filtered, stickyToReorder];
              
              // Sort by order to maintain consistent positioning
              result.sort((a, b) => a.order - b.order);
              return result;
            } else {
              // Sticky is not in unassigned, so it must be coming from a column
              // We'll handle this after we remove it from columns
              return prevUnassigned;
            }
          });
          
          // Remove from columns and add to unassigned (only if not already in unassigned)
          setColumns(prevColumns => {
            let stickyFromColumn: BoardData["stickies"][0] | null = null;
            
            // First pass: find and extract the sticky from any column
            const updatedColumns = prevColumns.map(column => {
              const stickyIndex = column.stickies.findIndex(s => s.id === data.stickyId);
              if (stickyIndex !== -1) {
                stickyFromColumn = { ...column.stickies[stickyIndex] };
                // Update order if provided
                if (data.order !== undefined) {
                  stickyFromColumn.order = data.order;
                }
                // Add to unassigned area immediately
                setUnassignedStickies(prevUnassigned => {
                  // Double-check it's not already there
                  if (prevUnassigned.some(s => s.id === data.stickyId)) {
                    return prevUnassigned;
                  }
                  
                  const result = [...prevUnassigned, stickyFromColumn!];
                  result.sort((a, b) => a.order - b.order);
                  
                  return result;
                });
                
                // Remove from this column
                return {
                  ...column,
                  stickies: column.stickies.filter(s => s.id !== data.stickyId),
                };
              }
              return column;
            });
            
            return updatedColumns;
          });
        } else {
          // Moving to a column
          
          // Remove from unassigned and add to target column
          setUnassignedStickies(prev => {
            const stickyIndex = prev.findIndex(s => s.id === data.stickyId);
            if (stickyIndex !== -1) {
              const stickyFromUnassigned = { ...prev[stickyIndex] };
              // Update order if provided
              if (data.order !== undefined) {
                stickyFromUnassigned.order = data.order;
              }
              // Add to target column immediately
              setColumns(prevColumns => {
                return prevColumns.map(column => {
                  if (column.id === data.columnId) {
                    // Target column - add the sticky
                    // Double-check it's not already there
                    if (column.stickies.some(s => s.id === data.stickyId)) {
                      return column;
                    }
                    
                    const newStickies = [...column.stickies, stickyFromUnassigned];
                    
                    // Sort by order
                    newStickies.sort((a, b) => a.order - b.order);
                    
                    return {
                      ...column,
                      stickies: newStickies,
                    };
                  }
                  return column;
                });
              });
              
              // Remove from unassigned
              return prev.filter(s => s.id !== data.stickyId);
            } else {
              // Sticky is not in unassigned, so it must be a column-to-column move
              return prev;
            }
          });
          
          // Handle column-to-column moves
          setColumns(prevColumns => {
            let stickyFromColumn: BoardData["stickies"][0] | null = null;
            
            // First pass: find and extract the sticky from source column
            const updatedColumns = prevColumns.map(column => {
              const stickyIndex = column.stickies.findIndex(s => s.id === data.stickyId);
              if (stickyIndex !== -1) {
                stickyFromColumn = { ...column.stickies[stickyIndex] };
                // Update order if provided
                if (data.order !== undefined) {
                  stickyFromColumn.order = data.order;
                }
                // Remove from source column
                return {
                  ...column,
                  stickies: column.stickies.filter(s => s.id !== data.stickyId),
                };
              }
              return column;
            });
            
            if (!stickyFromColumn) {
              // No sticky found in columns - it was probably moved from unassigned (handled above)
              return updatedColumns;
            }
            
            // Second pass: add to target column
            return updatedColumns.map(column => {
              if (column.id === data.columnId && stickyFromColumn) {
                // Target column - add the sticky
                const existingStickies = column.stickies.filter(s => s.id !== data.stickyId);
                const newStickies = [...existingStickies, stickyFromColumn];
                
                // Sort by order
                newStickies.sort((a, b) => a.order - b.order);
                
                return {
                  ...column,
                  stickies: newStickies,
                };
              }
              return column;
            });
          });
        }
      });
    }, [userId, flipAnimation]),
    onColumnRenamed: useCallback((data: ColumnRenameEvent) => {
      // Don't update if this rename was initiated by us
      if (data.userId === userId) {
        return;
      }


      // Update the column title in local state
      setColumns(prevColumns =>
        prevColumns.map(column =>
          column.id === data.columnId
            ? { ...column, title: data.title }
            : column
        )
      );
    }, [userId]),
    onColumnDeleted: useCallback((data: ColumnDeleteEvent) => {
      // Don't update if this deletion was initiated by us
      if (data.userId === userId) {
        return;
      }


      // For remote users, we need to move the stickies to unassigned and remove the column
      setColumns(prevColumns => {
        const columnToDelete = prevColumns.find(col => col.id === data.columnId);
        if (columnToDelete && columnToDelete.stickies.length > 0) {
          // Move stickies to unassigned notes area, checking for duplicates
          setUnassignedStickies(prev => {
            const existingIds = new Set(prev.map(sticky => sticky.id));
            const newStickies = columnToDelete.stickies.filter(
              sticky => !existingIds.has(sticky.id)
            );
            return [...prev, ...newStickies];
          });
        }
        
        // Remove the column from the list
        return prevColumns.filter(column => column.id !== data.columnId);
      });
    }, [userId]),
    onStickyUpdated: useCallback((data: StickyUpdateEvent) => {
      // Process all sticky updates (including our own) to maintain consistency

      // Update local state for both columns and unassigned stickies
      setColumns(prevColumns =>
        prevColumns.map(column => ({
          ...column,
          stickies: column.stickies.map(sticky =>
            sticky.id === data.stickyId
              ? {
                  ...sticky,
                  content: data.content || sticky.content,
                  color: data.color || sticky.color,
                  editedBy: data.editedBy,
                  editors: data.editors,
                }
              : sticky
          ),
        }))
      );

      setUnassignedStickies(prevStickies =>
        prevStickies.map(sticky =>
          sticky.id === data.stickyId
            ? {
                ...sticky,
                content: data.content || sticky.content,
                color: data.color || sticky.color,
                editedBy: data.editedBy,
                editors: data.editors,
              }
            : sticky
        )
      );
    }, []),
    onStickyCreated: useCallback((data: StickyCreateEvent) => {
      // Process all sticky creations (including our own) for consistency

      // Create the new sticky object from the event data
      const newSticky = {
        id: data.stickyId,
        content: data.content,
        color: data.color,
        positionX: data.positionX,
        positionY: data.positionY,
        order: 0, // Default order, will be updated by server if needed
        author: {
          ...data.author,
          password: '', // Not needed for display
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        editedBy: [],
        editors: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        boardId: data.boardId,
        columnId: data.columnId,
        authorId: data.author.id,
      };

      if (data.columnId === null) {
        // Add to unassigned area
        setUnassignedStickies(prevStickies => {
          // Don't add if already exists
          if (prevStickies.some(s => s.id === data.stickyId)) {
            return prevStickies;
          }
          return [...prevStickies, newSticky];
        });
      } else {
        // Add to specific column
        setColumns(prevColumns =>
          prevColumns.map(column =>
            column.id === data.columnId
              ? {
                  ...column,
                  stickies: column.stickies.some(s => s.id === data.stickyId)
                    ? column.stickies // Don't add if already exists
                    : [...column.stickies, newSticky],
                }
              : column
          )
        );
      }

      // Apply entering animation for remote sticky creations
      if (data.userId !== userId) {
        setTimeout(() => {
          animateStickyEntering(data.stickyId);
        }, 50); // Small delay to ensure DOM is updated
      }
    }, [userId]),
    onStickyDeleted: useCallback((data: StickyDeleteEvent) => {
      // Process all sticky deletions (including our own) for consistency
      
      // Remove sticky from columns
      setColumns(prevColumns =>
        prevColumns.map(column => ({
          ...column,
          stickies: column.stickies.filter(sticky => sticky.id !== data.stickyId),
        }))
      );

      // Remove sticky from unassigned area
      setUnassignedStickies(prevStickies =>
        prevStickies.filter(sticky => sticky.id !== data.stickyId)
      );
    }, []),
    onColumnCreated: useCallback((data: {
      columnId: string;
      title: string;
      boardId: string;
      order: number;
      color: string | null;
      userId: string;
      userName: string;
      timestamp: number;
    }) => {
      // Add new column to the local state for real-time updates
      const newColumn = {
        id: data.columnId,
        title: data.title,
        boardId: data.boardId,
        order: data.order,
        color: data.color,
        stickies: [], // New columns start empty
      };
      
      setColumns(prevColumns => {
        // Insert in the correct position based on order
        const newColumns = [...prevColumns, newColumn];
        return newColumns.sort((a, b) => a.order - b.order);
      });
      
      // Show success message for other users (not the creator)
      if (data.userId !== userId) {
        toast.success(`${data.userName} created column "${data.title}"`);
      }
    }, [userId]),
  });

  const handleColumnRenamed = useCallback((columnId: string, newTitle: string) => {
    setColumns(prevColumns =>
      prevColumns.map(column =>
        column.id === columnId
          ? { ...column, title: newTitle }
          : column
      )
    );
  }, []);

  const handleColumnDeleted = useCallback((columnId: string) => {
    // For the user who initiated the deletion, we need to move the stickies
    // to unassigned in the local state immediately so they don't disappear
    setColumns(prevColumns => {
      const columnToDelete = prevColumns.find(col => col.id === columnId);
      if (columnToDelete && columnToDelete.stickies.length > 0) {
        // Move stickies to unassigned notes area, but check for duplicates
        setUnassignedStickies(prev => {
          const existingIds = new Set(prev.map(sticky => sticky.id));
          const newStickies = columnToDelete.stickies.filter(
            sticky => !existingIds.has(sticky.id)
          );
          return [...prev, ...newStickies];
        });
      }
      
      // Remove the column from the list
      return prevColumns.filter(column => column.id !== columnId);
    });
  }, []);

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

    // Calculate move intent BEFORE updating local state for server-side order calculation
    const targetColumnId = overContainer === "unassigned" ? null : overContainer;
    
    // Get original items before any state changes
    const originalOverItems = getItemsForContainer(overContainer);
    const moveIntent: {
      columnId: string | null;
      insertAfterStickyId?: string;
      insertBeforeStickyId?: string;
      insertAtPosition?: 'start' | 'end';
    } = { columnId: targetColumnId };
    
    if (activeContainer === overContainer) {
      // Moving within the same container - use original items to calculate position
      if (overIndex === 0) {
        moveIntent.insertAtPosition = 'start';
      } else if (overIndex >= originalOverItems.length) {
        moveIntent.insertAtPosition = 'end';
      } else {
        // Calculate which item to insert after
        let insertAfterIndex: number;
        
        if (overIndex > activeIndex) {
          // Moving down: we want to insert after the item that will be at position overIndex-1 
          // AFTER the active item is removed. Since activeIndex < overIndex, removing activeIndex
          // shifts everything after it down by 1, so the item we want is currently at overIndex
          insertAfterIndex = overIndex;
        } else {
          // Moving up: insert after the item that's currently at overIndex-1
          // (since we remove activeIndex which is after overIndex, overIndex-1 stays in place)
          insertAfterIndex = overIndex - 1;
        }
        
        if (insertAfterIndex >= 0 && insertAfterIndex < originalOverItems.length) {
          const targetSticky = originalOverItems[insertAfterIndex];
          // Make sure we're not trying to insert after ourselves
          if (targetSticky.id !== activeId) {
            moveIntent.insertAfterStickyId = targetSticky.id;
          } else {
            // If we're trying to insert after ourselves, we need to adjust
            if (insertAfterIndex > 0) {
              const alternativeSticky = originalOverItems[insertAfterIndex - 1];
              moveIntent.insertAfterStickyId = alternativeSticky.id;
            } else {
              moveIntent.insertAtPosition = 'start';
            }
          }
        } else {
          moveIntent.insertAtPosition = insertAfterIndex < 0 ? 'start' : 'end';
        }
      }
    } else {
      // Moving between different containers
      if (overId === overContainer) {
        // Dropped on the container itself - append to end
        moveIntent.insertAtPosition = 'end';
      } else {
        // Dropped on a specific sticky - insert after it
        moveIntent.insertAfterStickyId = overId;
      }
    }

    // Now update the local state for immediate UI feedback
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
      
      const response = await fetch(`/api/stickies/${activeId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(moveIntent),
      });

      if (!response.ok) {
        throw new Error("Failed to update note");
      }

      const result = await response.json();
      const calculatedOrder = result.sticky.order;

      // Update local state with server-calculated order
      if (targetColumnId === null) {
        // Update unassigned stickies with correct order
        setUnassignedStickies(prev => 
          prev.map(sticky => 
            sticky.id === activeId 
              ? { ...sticky, order: calculatedOrder }
              : sticky
          ).sort((a, b) => a.order - b.order)
        );
      } else {
        // Update column stickies with correct order
        setColumns(prevColumns => 
          prevColumns.map(column => 
            column.id === targetColumnId
              ? {
                  ...column,
                  stickies: column.stickies.map(sticky =>
                    sticky.id === activeId
                      ? { ...sticky, order: calculatedOrder }
                      : sticky
                  ).sort((a, b) => a.order - b.order)
                }
              : column
          )
        );
      }

      // Emit socket event with server-calculated order
      if (isConnected) {
        emitStickyMoved({
          stickyId: activeId,
          columnId: targetColumnId,
          order: calculatedOrder,
          boardId: board.id,
        });
      }
      
      // No router.refresh() needed - WebSocket handles real-time UI updates
    } catch (error) {
      console.error("Failed to move note:", error);
      toast.error("Failed to move note");
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
  }, [findContainer, getItemsForContainer, initialColumns, isConnected, emitStickyMoved, board.stickies, board.id]);

  const activeSticky = findActiveSticky();

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="h-full p-6 bg-gradient-to-br from-background to-muted/20 overflow-auto">
        <div className="min-h-full flex gap-6" style={{ minWidth: 'max-content' }}>
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
                boardId={board.id}
                isOwner={isOwner}
                moveIndicators={moveIndicators}
                onColumnRenamed={handleColumnRenamed}
                onColumnDeleted={handleColumnDeleted}
              />
            ))}
          </SortableContext>

          {/* Add Column Button - Only visible to board owner */}
          {isOwner && (
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
          )}
        </div>

        {/* Removed floating button - now in header */}

        <CreateColumnDialog
          open={showCreateColumnDialog}
          onOpenChange={setShowCreateColumnDialog}
          boardId={board.id}
          onColumnCreated={() => {
            setShowCreateColumnDialog(false);
            // No router.refresh() needed - socket events handle real-time updates
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