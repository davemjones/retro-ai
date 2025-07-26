import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Plus, Users, Presentation, Calendar } from "lucide-react";
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
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {recentBoards.map((board) => (
                  <Card key={board.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="line-clamp-1">{board.title}</CardTitle>
                          <CardDescription className="line-clamp-2">
                            {board.description || "No description"}
                          </CardDescription>
                        </div>
                        {board.template && (
                          <Badge variant="secondary" className="ml-2 shrink-0">
                            {board.template.name}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center">
                            <Users className="mr-1 h-3 w-3" />
                            {board.team.name}
                          </div>
                          <div className="flex items-center">
                            <Calendar className="mr-1 h-3 w-3" />
                            {new Date(board.updatedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground">
                            {board._count.stickies} sticky note{board._count.stickies !== 1 ? "s" : ""}
                          </p>
                          <Button asChild size="sm">
                            <Link href={`/boards/${board.id}`}>Open Board</Link>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {boardCount > 3 && (
                <div className="pt-4 border-t">
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/boards">
                      View All {boardCount} Boards
                    </Link>
                  </Button>
                </div>
              )}
            </>
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
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {userTeams.map((team) => {
                  const userMember = team.members.find((m) => m.userId === session.user?.id);
                  return (
                    <Card key={team.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle>{team.name}</CardTitle>
                            <CardDescription>
                              {team.members.length} member{team.members.length !== 1 ? "s" : ""}
                            </CardDescription>
                          </div>
                          <Badge variant={userMember?.role === "OWNER" ? "default" : "secondary"}>
                            {userMember?.role}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Presentation className="mr-2 h-4 w-4" />
                            {team._count.boards} board{team._count.boards !== 1 ? "s" : ""}
                          </div>
                          <div className="flex gap-2">
                            <Button asChild size="sm" className="flex-1">
                              <Link href={`/teams/${team.id}`}>View Team</Link>
                            </Button>
                            <Button asChild size="sm" variant="outline" className="flex-1">
                              <Link href={`/boards/new?teamId=${team.id}`}>New Board</Link>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              <div className="pt-4 border-t">
                <Button asChild variant="outline" className="w-full">
                  <Link href="/teams">
                    View All Teams
                  </Link>
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}