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

    const { title, boardId, color } = await req.json();

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "Column title is required" },
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
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: {
        team: {
          include: {
            members: {
              where: { userId: session.user.id },
            },
          },
        },
      },
    });

    if (!board || board.team.members.length === 0) {
      return NextResponse.json(
        { error: "Board not found or access denied" },
        { status: 404 }
      );
    }

    // Get the next order number
    const maxOrder = await prisma.column.aggregate({
      where: { boardId },
      _max: { order: true },
    });

    const nextOrder = (maxOrder._max.order || 0) + 1;

    // Create the column
    const column = await prisma.column.create({
      data: {
        title: title.trim(),
        boardId,
        order: nextOrder,
        color: color || null,
      },
    });

    return NextResponse.json({ column });
  } catch (error) {
    console.error("Column creation error:", error);
    return NextResponse.json(
      { error: "Failed to create column" },
      { status: 500 }
    );
  }
}