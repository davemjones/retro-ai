import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Plus, Presentation, Users, Calendar, Archive } from "lucide-react";

async function getUserBoards(userId: string) {
  const boards = await prisma.board.findMany({
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
  });

  return boards;
}

export default async function BoardsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/");
  }

  const boards = await getUserBoards(session.user.id);

  return (
    <div className="h-full overflow-y-auto">
      <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Boards</h2>
          <p className="text-muted-foreground">
            View and manage your retrospective boards
          </p>
        </div>
        <Button asChild>
          <Link href="/boards/new">
            <Plus className="mr-2 h-4 w-4" />
            New Board
          </Link>
        </Button>
      </div>

      {boards.length === 0 ? (
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Presentation className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>No boards yet</CardTitle>
            <CardDescription>
              Create your first retrospective board to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/boards/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Board
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => (
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
                      {new Date(board.createdAt).toLocaleDateString()}
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
      )}

      <div className="flex justify-end">
        <Button variant="outline" asChild>
          <Link href="/boards/archived">
            <Archive className="mr-2 h-4 w-4" />
            View Archived Boards
          </Link>
        </Button>
      </div>
      </div>
    </div>
  );
}