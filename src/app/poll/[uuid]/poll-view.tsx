"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Loader2, Clock, TimerOff } from "lucide-react";
import { isPollExpired, formatTimeRemaining } from "@/lib/poll-schema";

interface PollAnswer {
  id: string;
  answer: string;
  _count: { votes: number };
}

interface Poll {
  id: string;
  question: string;
  createdAt: string;
  maxDuration: number | null;
  answers: PollAnswer[];
  _count: { votes: number };
}

async function fetchPoll(uuid: string): Promise<Poll> {
  const res = await fetch(`/api/polls/${uuid}`);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "Failed to load poll");
  }
  return res.json();
}

async function submitVote(uuid: string, answerId: string) {
  const res = await fetch(`/api/polls/${uuid}/votes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answerId }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "Failed to submit vote");
  }
  return res.json() as Promise<{ id: string }>;
}

function ResultsBars({
  answers,
  totalVotes,
}: {
  answers: PollAnswer[];
  totalVotes: number;
}) {
  return (
    <div className="space-y-2">
      {answers.map((answer) => {
        const pct =
          totalVotes > 0 ? (answer._count.votes / totalVotes) * 100 : 0;
        return (
          <div
            key={answer.id}
            className="relative w-full overflow-hidden rounded-lg border border-input px-4 py-3"
          >
            <div
              className="bg-primary/10 absolute inset-y-0 left-0 transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
            <span className="relative flex items-center justify-between text-sm">
              <span>{answer.answer}</span>
              <Badge variant="secondary">
                {answer._count.votes} ({Math.round(pct)}%)
              </Badge>
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function PollView({ uuid }: { uuid: string }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const poll = useQuery({
    queryKey: ["poll", uuid],
    queryFn: () => fetchPoll(uuid),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && isPollExpired(data.createdAt, data.maxDuration)) return false;
      return 500;
    },
    refetchIntervalInBackground: false,
  });

  const vote = useMutation({
    mutationFn: (answerId: string) => submitVote(uuid, answerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["poll", uuid] });
    },
  });

  if (poll.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="text-muted-foreground size-8 animate-spin" />
      </div>
    );
  }

  if (poll.isError) {
    return (
      <div className="py-20 text-center">
        <p className="text-destructive leading-7">{poll.error.message}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => poll.refetch()}
        >
          Try again
        </Button>
      </div>
    );
  }

  const data = poll.data!;
  const totalVotes = data._count.votes;
  const hasVoted = vote.isSuccess;
  const expired = isPollExpired(data.createdAt, data.maxDuration);
  const showResults = hasVoted || expired;

  const timeRemaining = data.maxDuration
    ? formatTimeRemaining(data.createdAt, data.maxDuration)
    : null;

  return (
    <main className="space-y-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="scroll-m-20 text-3xl font-semibold tracking-tight">
          {data.question}
        </h2>
        <div className="flex shrink-0 items-center gap-2">
          {expired ? (
            <Badge variant="destructive" className="gap-1">
              <TimerOff className="size-3" />
              Expired
            </Badge>
          ) : timeRemaining ? (
            <Badge variant="outline" className="gap-1">
              <Clock className="size-3" />
              {timeRemaining} left
            </Badge>
          ) : null}
          <Badge variant="outline">
            {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
          </Badge>
        </div>
      </div>

      <Separator />

      {!showResults ? (
        <RadioGroup
          value={selectedId ?? ""}
          onValueChange={setSelectedId}
          disabled={vote.isPending}
        >
          {data.answers.map((answer) => (
            <Label
              key={answer.id}
              htmlFor={answer.id}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors hover:bg-accent",
                selectedId === answer.id
                  ? "border-primary bg-primary/5"
                  : "border-input",
              )}
            >
              <RadioGroupItem value={answer.id} id={answer.id} />
              {answer.answer}
            </Label>
          ))}
        </RadioGroup>
      ) : (
        <ResultsBars answers={data.answers} totalVotes={totalVotes} />
      )}

      {vote.isError && (
        <p className="text-destructive text-sm leading-7">
          {vote.error.message}
        </p>
      )}

      {!showResults && (
        <Button
          disabled={!selectedId || vote.isPending}
          onClick={() => selectedId && vote.mutate(selectedId)}
        >
          {vote.isPending && <Loader2 className="animate-spin" />}
          {vote.isPending ? "Submitting..." : "Vote"}
        </Button>
      )}
    </main>
  );
}
