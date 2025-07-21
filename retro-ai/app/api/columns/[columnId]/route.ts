import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ columnId: string }> }
) {
  const { columnId } = await params;
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const { title } = await req.json();

    // Validate title
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json(
        { error: "Invalid title" },
        { status: 400 }
      );
    }

    const trimmedTitle = title.trim();

    // Find the column and verify ownership
    const column = await prisma.column.findUnique({
      where: { id: columnId },
      include: {
        board: {
          select: {
            id: true,
            createdById: true,
          },
        },
      },
    });

    if (!column) {
      return NextResponse.json(
        { error: "Column not found" },
        { status: 404 }
      );
    }

    // Check if user is the board owner
    if (column.board.createdById !== user.id) {
      return NextResponse.json(
        { error: "Only board owners can rename columns" },
        { status: 403 }
      );
    }

    // Update the column
    const updatedColumn = await prisma.column.update({
      where: { id: columnId },
      data: { title: trimmedTitle },
    });

    return NextResponse.json(updatedColumn);
  } catch (error) {
    console.error("Error updating column:", error);
    return NextResponse.json(
      { error: "Failed to update column" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ columnId: string }> }
) {
  const { columnId } = await params;
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Find the column and verify ownership
    const column = await prisma.column.findUnique({
      where: { id: columnId },
      include: {
        board: {
          select: {
            id: true,
            createdById: true,
          },
        },
        stickies: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!column) {
      return NextResponse.json(
        { error: "Column not found" },
        { status: 404 }
      );
    }

    // Check if user is the board owner
    if (column.board.createdById !== user.id) {
      return NextResponse.json(
        { error: "Only board owners can delete columns" },
        { status: 403 }
      );
    }

    // Use a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Move all sticky notes in this column to unassigned (columnId = null)
      await tx.sticky.updateMany({
        where: { columnId: columnId },
        data: { columnId: null },
      });

      // Delete the column
      const deletedColumn = await tx.column.delete({
        where: { id: columnId },
      });

      return {
        deletedColumn,
        migratedStickiesCount: column.stickies.length,
        boardId: column.board.id,
      };
    });

    return NextResponse.json({
      message: "Column deleted successfully",
      deletedColumn: result.deletedColumn,
      migratedStickiesCount: result.migratedStickiesCount,
      boardId: result.boardId,
    });
  } catch (error) {
    console.error("Error deleting column:", error);
    return NextResponse.json(
      { error: "Failed to delete column" },
      { status: 500 }
    );
  }
}