import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { ArrowLeft, Plus, Shield, Crown, User } from "lucide-react";
import { TeamInviteDialog } from "@/components/teams/team-invite-dialog";

async function getTeam(teamId: string, userId: string) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      members: {
        include: {
          user: true,
        },
        orderBy: {
          joinedAt: "asc",
        },
      },
      boards: {
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
      },
      _count: {
        select: {
          boards: true,
        },
      },
    },
  });

  if (!team) {
    return null;
  }

  // Check if user is a member
  const isMember = team.members.some((m) => m.userId === userId);
  if (!isMember) {
    return null;
  }

  return team;
}

function getRoleIcon(role: string) {
  switch (role) {
    case "OWNER":
      return <Crown className="h-4 w-4" />;
    case "ADMIN":
      return <Shield className="h-4 w-4" />;
    default:
      return <User className="h-4 w-4" />;
  }
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/");
  }

  const team = await getTeam(teamId, session.user.id);

  if (!team) {
    notFound();
  }

  const currentUserMember = team.members.find((m) => m.userId === session.user.id);
  const isOwnerOrAdmin = currentUserMember?.role === "OWNER" || currentUserMember?.role === "ADMIN";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/teams">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{team.name}</h2>
            <p className="text-muted-foreground">
              Team code: <code className="font-mono text-sm">{team.code}</code>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href={`/boards/new?teamId=${team.id}`}>
              <Plus className="mr-2 h-4 w-4" />
              New Board
            </Link>
          </Button>
          {isOwnerOrAdmin && <TeamInviteDialog teamCode={team.code} />}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>
              {team.members.length} member{team.members.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {team.members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{member.user.name || "User"}</p>
                        <p className="text-sm text-muted-foreground">{member.user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={member.role === "OWNER" ? "default" : "secondary"}>
                        <span className="mr-1">{getRoleIcon(member.role)}</span>
                        {member.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(member.joinedAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Boards</CardTitle>
            <CardDescription>
              {team._count.boards} total board{team._count.boards !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {team.boards.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No boards created yet
              </p>
            ) : (
              <div className="space-y-2">
                {team.boards.map((board) => (
                  <div
                    key={board.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">{board.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(board.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/boards/${board.id}`}>View</Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}