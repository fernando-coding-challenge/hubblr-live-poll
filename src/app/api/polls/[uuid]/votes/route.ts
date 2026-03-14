import { NextResponse } from "next/server";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isPollExpired } from "@/lib/poll-schema";

const submitVoteSchema = z.object({
  answerId: z.string().uuid(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ uuid: string }> },
) {
  const { uuid } = await params;

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: StatusCodes.BAD_REQUEST },
    );
  }

  const parsed = submitVoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: StatusCodes.BAD_REQUEST },
    );
  }

  const { answerId } = parsed.data;

  const poll = await prisma.poll.findUnique({
    where: { id: uuid },
    select: { createdAt: true, maxDuration: true },
  });

  if (!poll) {
    return NextResponse.json(
      { error: "Poll not found" },
      { status: StatusCodes.NOT_FOUND },
    );
  }

  if (isPollExpired(poll.createdAt, poll.maxDuration)) {
    return NextResponse.json(
      { error: "This poll has expired and is no longer accepting votes" },
      { status: StatusCodes.GONE },
    );
  }

  const answer = await prisma.pollAnswer.findFirst({
    where: { id: answerId, pollId: uuid },
  });

  if (!answer) {
    return NextResponse.json(
      { error: "Answer does not belong to this poll" },
      { status: StatusCodes.BAD_REQUEST },
    );
  }

  const vote = await prisma.vote.create({
    data: {
      pollId: uuid,
      selectedAnswerId: answerId,
    },
  });

  return NextResponse.json({ id: vote.id }, { status: StatusCodes.CREATED });
}
