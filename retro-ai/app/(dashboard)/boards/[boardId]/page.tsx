import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft, Settings, Users, Calendar } from "lucide-react";
import { BoardCanvas } from "@/components/board/board-canvas";
import { BoardPresence } from "@/components/board/board-presence";
import { BoardTimer } from "@/components/board/timer-component";
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

async function getBoard(boardId: string, userId: string): Promise<BoardWithRelations | null> {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      team: {
        include: {
          members: {
            where: { userId },
          },
        },
      },
      template: true,
      columns: {
        orderBy: { order: "asc" },
        include: {
          stickies: {
            include: {
              author: true,
            },
            orderBy: { order: "asc" },
          },
        },
      },
      stickies: {
        where: { columnId: null },
        include: {
          author: true,
        },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!board) {
    return null;
  }

  // Check if user is a member of the team
  if (board.team.members.length === 0) {
    return null;
  }

  // Fetch editor data for all stickies
  const allStickies = [
    ...board.columns.flatMap((col: BoardWithRelations['columns'][0]) => col.stickies),
    ...board.stickies
  ];
  
  const editorIds = [...new Set(allStickies.flatMap((sticky: BoardWithRelations['stickies'][0]) => sticky.editedBy))];
  const editors = await prisma.user.findMany({
    where: { id: { in: editorIds } },
    select: { id: true, name: true, email: true }
  });
  
  const editorMap = Object.fromEntries(editors.map((e: { id: string; name: string | null; email: string }) => [e.id, e]));
  
  // Add editor data to stickies
  const boardWithEditors = {
    ...board,
    columns: board.columns.map((col: BoardWithRelations['columns'][0]) => ({
      ...col,
      stickies: col.stickies.map((sticky: BoardWithRelations['stickies'][0]) => ({
        ...sticky,
        editors: sticky.editedBy.map((id: string) => editorMap[id]).filter(Boolean)
      }))
    })),
    stickies: board.stickies.map((sticky: BoardWithRelations['stickies'][0]) => ({
      ...sticky,
      editors: sticky.editedBy.map((id: string) => editorMap[id]).filter(Boolean)
    }))
  };

  return boardWithEditors;
}

export default async function BoardPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/");
  }

  const board = await getBoard(boardId, session.user.id);

  if (!board) {
    notFound();
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/boards">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{board.title}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center">
                <Users className="mr-1 h-3 w-3" />
                {board.team.name}
              </div>
              <div className="flex items-center">
                <Calendar className="mr-1 h-3 w-3" />
                {new Date(board.createdAt).toLocaleDateString()}
              </div>
              {board.template && (
                <Badge variant="secondary">{board.template.name}</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <BoardPresence 
            boardId={board.id} 
            currentUserId={session.user.id}
          />
          <div className="h-4 w-px bg-border" />
          <BoardTimer 
            boardId={board.id}
            userId={session.user.id}
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
          userId={session.user.id}
          isOwner={board.createdById === session.user.id}
        />
      </div>
    </div>
  );
}