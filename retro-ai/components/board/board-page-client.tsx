"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Users, Calendar, Plus } from "lucide-react";
import { SmartBackButton } from "@/components/navigation/smart-back-button";
import { BoardCanvas } from "@/components/board/board-canvas";
import { BoardPresence } from "@/components/board/board-presence";
import { BoardTimer } from "@/components/board/timer-component";
import { CreateStickyDialog } from "@/components/board/create-sticky-dialog";
import { Prisma } from "@prisma/client";

type BoardWithRelations = Prisma.BoardGetPayload<{
  include: {
    team: {
      include: {
        members: true;
      };
    };
    template: true;
    columns: {
      include: {
        stickies: {
          include: {
            author: true;
          };
        };
      };
    };
    stickies: {
      include: {
        author: true;
      };
    };
  };
}>;

interface BoardPageClientProps {
  board: BoardWithRelations;
  userId: string;
}

export function BoardPageClient({ board, userId }: BoardPageClientProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-4">
          <SmartBackButton fallbackPath="/boards" />
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">{board.title}</h1>
              <div className="flex items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                <div className="flex items-center">
                  <Users className="mr-1 h-3 w-3" />
                  <span className="hidden sm:inline">{board.team.name}</span>
                  <span className="sm:hidden">{board.team.name.length > 10 ? board.team.name.substring(0, 10) + '...' : board.team.name}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="mr-1 h-3 w-3" />
                  <span className="hidden sm:inline">{new Date(board.createdAt).toLocaleDateString()}</span>
                  <span className="sm:hidden">{new Date(board.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>
                {board.template && (
                  <Badge variant="secondary" className="hidden sm:inline-flex">{board.template.name}</Badge>
                )}
              </div>
            </div>
            <Button
              className="ml-2 sm:ml-4 flex-shrink-0"
              size="sm"
              onClick={() => setShowCreateDialog(true)}
              data-testid="header-add-note-button"
            >
              <Plus className="mr-1 sm:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Add Note</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <BoardPresence 
            boardId={board.id} 
            currentUserId={userId}
          />
          <div className="h-4 w-px bg-border" />
          <BoardTimer 
            boardId={board.id}
            userId={userId}
          />
          <div className="h-4 w-px bg-border" />
          <Button variant="outline" size="sm">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* Board Canvas */}
      <div className="flex-1 overflow-hidden">
        <BoardCanvas
          board={board}
          columns={board.columns}
          userId={userId}
          isOwner={board.createdById === userId}
        />
      </div>

      <CreateStickyDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        boardId={board.id}
        columns={board.columns}
        onStickyCreated={() => {
          setShowCreateDialog(false);
        }}
      />
    </div>
  );
}