import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft, Settings, Users, Calendar } from "lucide-react";
import { BoardCanvas } from "@/components/board/board-canvas";

async function getBoard(boardId: string, userId: string) {
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
            orderBy: { createdAt: "asc" },
          },
        },
      },
      stickies: {
        where: { columnId: null },
        include: {
          author: true,
        },
        orderBy: { createdAt: "asc" },
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

  return board;
}

export default async function BoardPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
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