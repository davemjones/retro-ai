import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, Users, Presentation } from "lucide-react";
import { prisma } from "@/lib/prisma";

async function getUserStats(userId: string) {
  const [boardCount, teamCount] = await Promise.all([
    // Count boards where user is a team member
    prisma.board.count({
      where: {
        team: {
          members: {
            some: {
              userId: userId,
            },
          },
        },
        isArchived: false,
      },
    }),
    // Count teams where user is a member
    prisma.team.count({
      where: {
        members: {
          some: {
            userId: userId,
          },
        },
      },
    }),
  ]);

  return { boardCount, teamCount };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/");
  }

  const { boardCount, teamCount } = await getUserStats(session.user.id);

  return (
    <div className="h-full overflow-y-auto">
      <div className="container mx-auto p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Welcome back, {session.user?.name || "User"}!
        </h2>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s happening with your retrospectives
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Boards</CardTitle>
            <Presentation className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{boardCount}</div>
            <p className="text-xs text-muted-foreground">
              {boardCount === 0 ? "Create your first board" : "View all boards"}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Teams</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamCount}</div>
            <p className="text-xs text-muted-foreground">
              {teamCount === 0 ? "Join or create a team" : "Manage team settings"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
            <Plus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <Button asChild size="sm" className="w-full">
                <Link href="/boards/new">New Board</Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="w-full">
                <Link href="/teams/new">Create Team</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Boards</CardTitle>
            <CardDescription>
              Your recently accessed retrospective boards
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center py-6">
              No boards yet. Create your first board to get started!
            </p>
            <div className="flex justify-center">
              <Button asChild>
                <Link href="/boards/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Board
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Teams</CardTitle>
            <CardDescription>
              Teams you&apos;re a member of
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center py-6">
              You&apos;re not part of any teams yet.
            </p>
            <div className="flex justify-center gap-2">
              <Button asChild>
                <Link href="/teams/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Team
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/teams/join">Join Team</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}