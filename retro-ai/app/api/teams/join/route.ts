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

    const { code } = await req.json();

    if (!code || !code.trim()) {
      return NextResponse.json(
        { error: "Team code is required" },
        { status: 400 }
      );
    }

    // Find team by code
    const team = await prisma.team.findUnique({
      where: { code: code.trim().toUpperCase() },
      include: {
        members: true,
      },
    });

    if (!team) {
      return NextResponse.json(
        { error: "Invalid team code" },
        { status: 404 }
      );
    }

    // Check if user is already a member
    const existingMember = team.members.find(
      (member) => member.userId === session.user.id
    );

    if (existingMember) {
      return NextResponse.json(
        { error: "You are already a member of this team" },
        { status: 400 }
      );
    }

    // Add user to team as a member
    await prisma.teamMember.create({
      data: {
        teamId: team.id,
        userId: session.user.id,
        role: "MEMBER",
      },
    });

    // Return team with updated members
    const updatedTeam = await prisma.team.findUnique({
      where: { id: team.id },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    return NextResponse.json({ team: updatedTeam });
  } catch (error) {
    console.error("Join team error:", error);
    return NextResponse.json(
      { error: "Failed to join team" },
      { status: 500 }
    );
  }
}