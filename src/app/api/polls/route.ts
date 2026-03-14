import { NextRequest, NextResponse } from "next/server";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createPollSchema } from "@/lib/poll-schema";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(
      1,
      parseInt(searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE), 10) ||
        DEFAULT_PAGE_SIZE,
    ),
  );

  const [polls, total] = await Promise.all([
    prisma.poll.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, question: true },
    }),
    prisma.poll.count(),
  ]);

  return NextResponse.json({
    data: polls,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: StatusCodes.BAD_REQUEST },
    );
  }

  const parsed = createPollSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: z.flattenError(parsed.error) },
      { status: StatusCodes.BAD_REQUEST },
    );
  }

  const { question, answers, duration } = parsed.data;

  const poll = await prisma.poll.create({
    data: {
      question,
      maxDuration: duration,
      answers: {
        create: answers.map((answer) => ({ answer })),
      },
    },
  });

  return NextResponse.json({ id: poll.id }, { status: StatusCodes.CREATED });
}
