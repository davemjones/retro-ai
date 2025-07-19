"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function JoinTeamPage() {
  const [teamCode, setTeamCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!teamCode.trim()) {
      toast.error("Team code is required");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/teams/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: teamCode.trim().toUpperCase(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to join team");
      }

      toast.success(`Successfully joined ${data.team.name}!`);
      router.push(`/teams/${data.team.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/teams">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Join Team</h2>
          <p className="text-muted-foreground">
            Enter the team code to join an existing team
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Code</CardTitle>
          <CardDescription>
            Ask your team owner or admin for the 6-character team code
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="teamCode">Enter Team Code</Label>
              <Input
                id="teamCode"
                type="text"
                placeholder="e.g., ABC123"
                value={teamCode}
                onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                required
                disabled={isLoading}
                autoFocus
                maxLength={6}
                className="font-mono text-lg text-center uppercase"
              />
            </div>
          </CardContent>
          <CardContent className="pt-0">
            <div className="flex gap-2">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Joining..." : "Join Team"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/teams")}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}