import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { content, color, boardId, columnId, positionX, positionY } = await req.json();

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    if (!boardId) {
      return NextResponse.json(
        { error: "Board ID is required" },
        { status: 400 }
      );
    }

    // Verify user has access to the board
    const board = await prisma.board.findFirst({
      where: {
        id: boardId,
        team: {
          members: {
            some: {
              userId: session.user.id,
            },
          },
        },
      },
    });

    if (!board) {
      return NextResponse.json(
        { error: "Board not found or access denied" },
        { status: 404 }
      );
    }

    // Create sticky note
    const sticky = await prisma.sticky.create({
      data: {
        content: content.trim(),
        color: color || "#FFE066",
        boardId,
        columnId: columnId || null,
        positionX: positionX || 0,
        positionY: positionY || 0,
        authorId: session.user.id,
      },
      include: {
        author: true,
      },
    });

    return NextResponse.json({ sticky });
  } catch (error) {
    console.error("Sticky creation error:", error);
    return NextResponse.json(
      { error: "Failed to create sticky note" },
      { status: 500 }
    );
  }
}