import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Plus, Users, Presentation } from "lucide-react";

async function getUserTeams(userId: string) {
  const teams = await prisma.team.findMany({
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
  });

  return teams;
}

export default async function TeamsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/");
  }

  const teams = await getUserTeams(session.user.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Teams</h2>
          <p className="text-muted-foreground">
            Manage your teams and collaborate with others
          </p>
        </div>
        <div className="flex gap-2">
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
      </div>

      {teams.length === 0 ? (
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>No teams yet</CardTitle>
            <CardDescription>
              Create a team to start collaborating on retrospectives
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/teams/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Team
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => {
            const userMember = team.members.find((m) => m.userId === session.user.id);
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
      )}
    </div>
  );
}