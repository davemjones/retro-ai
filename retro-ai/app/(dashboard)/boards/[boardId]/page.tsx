import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BoardPageClient } from "@/components/board/board-page-client";
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

  return <BoardPageClient board={board} userId={session.user.id} />;
}