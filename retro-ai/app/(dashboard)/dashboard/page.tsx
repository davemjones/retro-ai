import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, Users, Presentation } from "lucide-react";
import { prisma } from "@/lib/prisma";

async function getUserStats(userId: string) {
  const [recentBoards, userTeams] = await Promise.all([
    // Get recent boards where user is a team member
    prisma.board.findMany({
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
      take: 3, // Only get the 3 most recent
    }),
    // Get teams where user is a member with details
    prisma.team.findMany({
      where: {
        members: {
          some: {
            userId: userId,
          },
        },
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
        _count: {
          select: {
            boards: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  // Get the total board count from a separate query
  const boardCount = await prisma.board.count({
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
  });

  return { recentBoards, boardCount, userTeams, teamCount: userTeams.length };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/");
  }

  const { recentBoards, boardCount, userTeams, teamCount } = await getUserStats(session.user.id);

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

      {/* Unified Boards Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Presentation className="h-5 w-5" />
              Boards
              <span className="text-lg font-normal text-muted-foreground">({boardCount})</span>
            </CardTitle>
            <CardDescription>
              Your retrospective boards
            </CardDescription>
          </div>
          <Button asChild>
            <Link href="/boards/new">
              <Plus className="mr-2 h-4 w-4" />
              New Board
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentBoards.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-4">
                No boards yet. Create your first board to get started!
              </p>
              <Button asChild>
                <Link href="/boards/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Board
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentBoards.map((board) => (
                <div key={board.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <div className="flex-1">
                    <Link href={`/boards/${board.id}`} className="block">
                      <h4 className="font-medium hover:text-primary transition-colors">{board.title}</h4>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                        <span>{board.team.name}</span>
                        <span>{board._count.stickies} sticky note{board._count.stickies !== 1 ? 's' : ''}</span>
                        <span>Updated {new Date(board.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </Link>
                  </div>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/boards/${board.id}`}>
                      Open
                    </Link>
                  </Button>
                </div>
              ))}
              {boardCount > 3 && (
                <div className="pt-2 border-t">
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/boards">
                      View All {boardCount} Boards
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unified Teams Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Teams
              <span className="text-lg font-normal text-muted-foreground">({teamCount})</span>
            </CardTitle>
            <CardDescription>
              Your team memberships
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/teams/join">
                Join Team
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/teams/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Team
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {userTeams.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-4">
                You&apos;re not part of any teams yet.
              </p>
              <div className="flex justify-center gap-2">
                <Button asChild>
                  <Link href="/teams/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Team
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/teams/join">Join Team</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {userTeams.map((team) => (
                <div key={team.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <div className="flex-1">
                    <Link href={`/teams/${team.id}`} className="block">
                      <h4 className="font-medium hover:text-primary transition-colors">{team.name}</h4>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                        <span>{team.members.length} member{team.members.length !== 1 ? 's' : ''}</span>
                        <span>{team._count.boards} board{team._count.boards !== 1 ? 's' : ''}</span>
                        <span>Created {new Date(team.createdAt).toLocaleDateString()}</span>
                      </div>
                    </Link>
                  </div>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/teams/${team.id}`}>
                      View
                    </Link>
                  </Button>
                </div>
              ))}
              <div className="pt-2 border-t">
                <Button asChild variant="outline" className="w-full">
                  <Link href="/teams">
                    View All Teams
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}