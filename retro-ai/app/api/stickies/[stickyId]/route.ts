import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateStickyOrder, type MoveIntent } from "@/lib/lexicographic-order";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ stickyId: string }> }
) {
  const { stickyId } = await params;
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { 
      content, 
      color, 
      columnId, 
      positionX, 
      positionY,
      // New order-related fields
      insertAfterStickyId,
      insertBeforeStickyId,
      insertAtPosition
    } = await req.json();

    // Find the sticky note
    const sticky = await prisma.sticky.findUnique({
      where: { id: stickyId },
      include: {
        board: {
          include: {
            team: {
              include: {
                members: {
                  where: { userId: session.user.id },
                },
              },
            },
          },
        },
      },
    });

    if (!sticky) {
      return NextResponse.json(
        { error: "Sticky note not found" },
        { status: 404 }
      );
    }

    // Check if user has access to the board
    if (sticky.board.team.members.length === 0) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Allow team members to edit content and color (collaborative editing)
    // Track non-author edits in editedBy array
    const isEditingContent = content !== undefined || color !== undefined;
    const isNonAuthorEdit = isEditingContent && sticky.authorId !== session.user.id;
    
    // Calculate new order if this is a move operation
    let newOrder: number | undefined = undefined;
    
    if (columnId !== undefined && (insertAfterStickyId || insertBeforeStickyId || insertAtPosition)) {
      // Get existing stickies in the target column
      const existingStickies = await prisma.sticky.findMany({
        where: { 
          columnId: columnId,
          id: { not: stickyId } // Exclude the sticky being moved
        },
        select: { id: true, order: true },
        orderBy: { order: 'asc' }
      });

      const moveIntent: MoveIntent = {
        targetColumnId: columnId,
        ...(insertAfterStickyId && { insertAfterStickyId }),
        ...(insertBeforeStickyId && { insertBeforeStickyId }),
        ...(insertAtPosition && { insertAtPosition })
      };

      newOrder = calculateStickyOrder(existingStickies, moveIntent);
    }
    
    // Update sticky note
    const updatedSticky = await prisma.sticky.update({
      where: { id: stickyId },
      data: {
        ...(content !== undefined && { content: content.trim() }),
        ...(color !== undefined && { color }),
        ...(columnId !== undefined && { columnId }),
        ...(positionX !== undefined && { positionX }),
        ...(positionY !== undefined && { positionY }),
        ...(newOrder !== undefined && { order: newOrder }),
        // Add editor to editedBy array if they're not the original author
        // and not already in the array
        ...(isNonAuthorEdit && !sticky.editedBy.includes(session.user.id) && {
          editedBy: {
            push: session.user.id
          }
        }),
      },
      include: {
        author: true,
      },
    });

    return NextResponse.json({ sticky: updatedSticky });
  } catch (error) {
    console.error("Sticky update error:", error);
    return NextResponse.json(
      { error: "Failed to update sticky note" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ stickyId: string }> }
) {
  const { stickyId } = await params;
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Find the sticky note
    const sticky = await prisma.sticky.findUnique({
      where: { id: stickyId },
      include: {
        board: {
          include: {
            team: {
              include: {
                members: {
                  where: { userId: session.user.id },
                },
              },
            },
          },
        },
      },
    });

    if (!sticky) {
      return NextResponse.json(
        { error: "Sticky note not found" },
        { status: 404 }
      );
    }

    // Check if user has access to the board
    if (sticky.board.team.members.length === 0) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Check if user is the author or team admin/owner
    const userMember = sticky.board.team.members[0];
    const isAuthor = sticky.authorId === session.user.id;
    const isTeamAdminOrOwner = userMember.role === "ADMIN" || userMember.role === "OWNER";

    if (!isAuthor && !isTeamAdminOrOwner) {
      return NextResponse.json(
        { error: "Only the author or team admins can delete this sticky note" },
        { status: 403 }
      );
    }

    // Delete sticky note
    await prisma.sticky.delete({
      where: { id: stickyId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Sticky deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete sticky note" },
      { status: 500 }
    );
  }
}