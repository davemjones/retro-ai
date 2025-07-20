"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Team {
  id: string;
  name: string;
}

interface Template {
  id: string;
  name: string;
  description: string;
  columns: Array<{
    title: string;
    order: number;
    color: string;
  }>;
}

function NewBoardForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | undefined>(undefined);
  const [teams, setTeams] = useState<Team[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamId = searchParams.get("teamId");

  useEffect(() => {
    async function fetchData() {
      try {
        const [teamsRes, templatesRes] = await Promise.all([
          fetch("/api/teams"),
          fetch("/api/templates"),
        ]);

        if (teamsRes.ok) {
          const teamsData = await teamsRes.json();
          setTeams(teamsData.teams);
          
          // Pre-select team if provided in URL
          if (teamId && teamsData.teams.some((team: Team) => team.id === teamId)) {
            setSelectedTeam(teamId);
          }
        }

        if (templatesRes.ok) {
          const templatesData = await templatesRes.json();
          setTemplates(templatesData.templates);
        }
      } catch (error) {
        console.error("Failed to load teams/templates:", error);
        toast.error("Failed to load data");
      } finally {
        setIsLoadingData(false);
      }
    }

    fetchData();
  }, [teamId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error("Board title is required");
      return;
    }

    if (!selectedTeam) {
      toast.error("Please select a team");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/boards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          teamId: selectedTeam,
          templateId: selectedTemplate === "blank" ? null : selectedTemplate || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create board");
      }

      toast.success("Board created successfully!");
      router.push(`/boards/${data.board.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedTemplateData = selectedTemplate === "blank" ? null : templates.find(t => t.id === selectedTemplate);

  if (isLoadingData) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded mb-2"></div>
          <div className="h-4 bg-muted rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/boards">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Create Board</h2>
          <p className="text-muted-foreground">
            Set up a new retrospective board for your team
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Board Details</CardTitle>
            <CardDescription>
              Basic information about your retrospective board
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Board Title *</Label>
              <Input
                id="title"
                type="text"
                placeholder="e.g., Sprint 24 Retrospective"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={isLoading}
                autoFocus
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description for this retrospective..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isLoading}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="team">Team *</Label>
              <Select
                value={selectedTeam}
                onValueChange={setSelectedTeam}
                disabled={isLoading || teams.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {teams.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  You need to be part of a team to create boards.{" "}
                  <Link href="/teams/new" className="text-primary hover:underline">
                    Create a team
                  </Link>
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Template</CardTitle>
            <CardDescription>
              Choose a template to structure your retrospective
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template">Template</Label>
              <Select
                value={selectedTemplate}
                onValueChange={setSelectedTemplate}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a template (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blank">Blank Board</SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTemplateData && (
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">{selectedTemplateData.name}</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  {selectedTemplateData.description}
                </p>
                <div className="flex gap-2 flex-wrap">
                  {selectedTemplateData.columns.map((column, index) => (
                    <div
                      key={index}
                      className="px-3 py-1 rounded text-sm font-medium text-white"
                      style={{ backgroundColor: column.color }}
                    >
                      {column.title}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" disabled={isLoading || teams.length === 0}>
            {isLoading ? "Creating..." : "Create Board"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/boards")}
            disabled={isLoading}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function NewBoardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NewBoardForm />
    </Suspense>
  );
}