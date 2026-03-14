"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Poll {
  id: string;
  question: string;
}

interface PollPage {
  data: Poll[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

const PAGE_SIZE = 10;

async function fetchPolls({
  pageParam,
}: {
  pageParam: number;
}): Promise<PollPage> {
  const res = await fetch(`/api/polls?page=${pageParam}&pageSize=${PAGE_SIZE}`);
  if (!res.ok) throw new Error("Failed to fetch polls");
  return res.json();
}

export function PollList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ["polls"],
    queryFn: fetchPolls,
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.page < lastPage.meta.totalPages
        ? lastPage.meta.page + 1
        : undefined,
  });

  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  );

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(handleIntersect, {
      rootMargin: "100px",
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleIntersect]);

  const total = data?.pages[0]?.meta.total ?? 0;
  const polls = data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-lg font-semibold tracking-tight">Poll list</h3>
        {!isLoading && (
          <Badge variant="secondary">
            {total} {total === 1 ? "poll" : "polls"}
          </Badge>
        )}
      </div>
      <Separator className="mb-3" />

      <ScrollArea className="min-h-0 flex-1 overflow-hidden">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
          </div>
        )}

        {isError && (
          <p className="text-destructive text-sm">Failed to load polls.</p>
        )}

        {!isLoading && polls.length === 0 && (
          <p className="text-muted-foreground py-12 text-center text-sm">
            No polls yet. Create one!
          </p>
        )}

        {polls.length > 0 && (
          <ul className="space-y-1.5">
            {polls.map((poll) => (
              <li key={poll.id}>
                <Link
                  href={`/poll/${poll.id}`}
                  className="border-border hover:bg-accent block rounded-md border px-3 py-2 transition-colors"
                >
                  <span className="truncate block text-sm">
                    {poll.question}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div
          ref={sentinelRef}
          className={cn("text-center", isFetchingNextPage && "py-3")}
        >
          {isFetchingNextPage && (
            <Loader2 className="text-muted-foreground mx-auto h-4 w-4 animate-spin" />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
