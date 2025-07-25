import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emitColumnCreated } from "@/lib/socket-events.mjs";

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

    // Verify user has access to the board and is the board owner
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

    // Only board owner can create columns
    if (board.createdById !== session.user.id) {
      return NextResponse.json(
        { error: "Only board owner can create columns" },
        { status: 403 }
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

    // Emit socket event for real-time updates
    try {
      emitColumnCreated(
        boardId, 
        column, 
        session.user.id, 
        session.user.name || session.user.email || 'Unknown User'
      );
    } catch (socketError) {
      console.error('Failed to emit column:created socket event:', socketError);
      // Don't fail the API call if socket emission fails
    }

    return NextResponse.json({ column });
  } catch (error) {
    console.error("Column creation error:", error);
    return NextResponse.json(
      { error: "Failed to create column" },
      { status: 500 }
    );
  }
}