"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface TeamInviteDialogProps {
  teamCode: string;
}

export function TeamInviteDialog({ teamCode }: TeamInviteDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(teamCode);
      setCopied(true);
      toast.success("Team code copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy team code");
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Members
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Team Members</DialogTitle>
          <DialogDescription>
            Share this code with your team members so they can join
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Team Code</Label>
            <div className="flex gap-2">
              <Input
                value={teamCode}
                readOnly
                className="font-mono text-lg text-center"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>Team members can join by:</p>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Going to the Teams page</li>
              <li>Clicking &quot;Join Team&quot;</li>
              <li>Entering this code</li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}