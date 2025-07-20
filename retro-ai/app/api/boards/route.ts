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

    const { title, description, teamId, templateId } = await req.json();

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "Board title is required" },
        { status: 400 }
      );
    }

    if (!teamId) {
      return NextResponse.json(
        { error: "Team ID is required" },
        { status: 400 }
      );
    }

    // Verify user is a member of the team
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        teamId: teamId,
        userId: session.user.id,
      },
    });

    if (!teamMember) {
      return NextResponse.json(
        { error: "You are not a member of this team" },
        { status: 403 }
      );
    }

    // Get template if provided
    let template = null;
    if (templateId) {
      template = await prisma.template.findUnique({
        where: { id: templateId },
      });
    }

    // Create board
    const board = await prisma.board.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        teamId: teamId,
        templateId: templateId || null,
        createdById: session.user.id,
      },
    });

    // Create columns if template is provided
    if (template && template.columns) {
      const columns = template.columns as Array<{
        title: string;
        order: number;
        color: string;
      }>;

      await Promise.all(
        columns.map((column) =>
          prisma.column.create({
            data: {
              title: column.title,
              order: column.order,
              color: column.color,
              boardId: board.id,
            },
          })
        )
      );
    }

    // Return board with relations
    const createdBoard = await prisma.board.findUnique({
      where: { id: board.id },
      include: {
        team: true,
        template: true,
        columns: {
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json({ board: createdBoard });
  } catch (error) {
    console.error("Board creation error:", error);
    return NextResponse.json(
      { error: "Failed to create board" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get("teamId");
    const archived = searchParams.get("archived") === "true";

    const boards = await prisma.board.findMany({
      where: {
        team: {
          members: {
            some: {
              userId: session.user.id,
            },
          },
        },
        ...(teamId && { teamId }),
        isArchived: archived,
      },
      include: {
        team: true,
        template: true,
        _count: {
          select: {
            stickies: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json({ boards });
  } catch (error) {
    console.error("Get boards error:", error);
    return NextResponse.json(
      { error: "Failed to get boards" },
      { status: 500 }
    );
  }
}