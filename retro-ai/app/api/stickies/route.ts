import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateStickyOrder } from "@/lib/lexicographic-order";

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

    // Calculate order for new sticky
    let order = 1000.0; // Default for empty columns
    
    if (columnId) {
      // Get existing stickies in the target column
      const existingStickies = await prisma.sticky.findMany({
        where: { columnId },
        select: { id: true, order: true },
        orderBy: { order: 'asc' }
      });
      
      // Append to end of column
      order = calculateStickyOrder(existingStickies, {
        targetColumnId: columnId,
        insertAtPosition: 'end'
      });
    } else {
      // For unassigned stickies, get existing unassigned stickies
      const existingUnassigned = await prisma.sticky.findMany({
        where: { boardId, columnId: null },
        select: { id: true, order: true },
        orderBy: { order: 'asc' }
      });
      
      // Append to end of unassigned area
      if (existingUnassigned.length > 0) {
        order = calculateStickyOrder(existingUnassigned, {
          targetColumnId: null,
          insertAtPosition: 'end'
        });
      }
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
        order,
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