import { NextResponse } from "next/server";
import { StatusCodes } from "http-status-codes";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ uuid: string }> },
) {
  const { uuid } = await params;

  const poll = await prisma.poll.findUnique({
    where: { id: uuid },
    select: {
      id: true,
      question: true,
      createdAt: true,
      maxDuration: true,
      answers: {
        select: { id: true, answer: true, _count: { select: { votes: true } } },
      },
      _count: { select: { votes: true } },
    },
  });

  if (!poll) {
    return NextResponse.json(
      { error: "Poll not found" },
      { status: StatusCodes.NOT_FOUND },
    );
  }

  return NextResponse.json(poll);
}
