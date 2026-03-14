import { describe, it, expect, vi, beforeEach } from "vitest";
import { StatusCodes } from "http-status-codes";
import { NextRequest } from "next/server";
import { DURATION_DEFAULT } from "@/lib/poll-schema";

const mockPrisma = {
  poll: {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

const { POST, GET } = await import("./route");

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/polls", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/polls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a poll and returns 201", async () => {
    const fakeId = "aaaa-bbbb-cccc";
    mockPrisma.poll.create.mockResolvedValue({ id: fakeId });

    const res = await POST(
      jsonRequest({
        question: "Favorite color?",
        answers: ["Red", "Blue"],
      }),
    );

    expect(res.status).toBe(StatusCodes.CREATED);
    expect(await res.json()).toEqual({ id: fakeId });
    expect(mockPrisma.poll.create).toHaveBeenCalledWith({
      data: {
        question: "Favorite color?",
        maxDuration: DURATION_DEFAULT,
        answers: {
          create: [{ answer: "Red" }, { answer: "Blue" }],
        },
      },
    });
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/polls", {
      method: "POST",
      body: "not json",
    });

    const res = await POST(req);
    expect(res.status).toBe(StatusCodes.BAD_REQUEST);
    expect(await res.json()).toEqual({ error: "Invalid JSON" });
  });

  it("returns 400 when question is missing", async () => {
    const res = await POST(jsonRequest({ answers: ["A", "B"] }));

    expect(res.status).toBe(StatusCodes.BAD_REQUEST);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
  });

  it("returns 400 when fewer than 2 answers", async () => {
    const res = await POST(
      jsonRequest({ question: "Q?", answers: ["Only one"] }),
    );

    expect(res.status).toBe(StatusCodes.BAD_REQUEST);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
  });

  it("returns 400 when more than 5 answers", async () => {
    const res = await POST(
      jsonRequest({
        question: "Q?",
        answers: ["A", "B", "C", "D", "E", "F"],
      }),
    );

    expect(res.status).toBe(StatusCodes.BAD_REQUEST);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
  });
});

describe("GET /api/polls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns paginated polls with defaults", async () => {
    const fakePolls = [{ id: "1", question: "Q1?" }];
    mockPrisma.poll.findMany.mockResolvedValue(fakePolls);
    mockPrisma.poll.count.mockResolvedValue(1);

    const req = new NextRequest("http://localhost/api/polls");
    const res = await GET(req);

    expect(res.status).toBe(StatusCodes.OK);
    const body = await res.json();
    expect(body.data).toEqual(fakePolls);
    expect(body.meta).toEqual({
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });
  });

  it("respects page and pageSize params", async () => {
    mockPrisma.poll.findMany.mockResolvedValue([]);
    mockPrisma.poll.count.mockResolvedValue(50);

    const req = new NextRequest(
      "http://localhost/api/polls?page=3&pageSize=10",
    );
    await GET(req);

    expect(mockPrisma.poll.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 10,
      }),
    );
  });

  it("clamps pageSize to max 100", async () => {
    mockPrisma.poll.findMany.mockResolvedValue([]);
    mockPrisma.poll.count.mockResolvedValue(0);

    const req = new NextRequest("http://localhost/api/polls?pageSize=500");
    await GET(req);

    expect(mockPrisma.poll.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 }),
    );
  });

  it("defaults page to 1 for invalid values", async () => {
    mockPrisma.poll.findMany.mockResolvedValue([]);
    mockPrisma.poll.count.mockResolvedValue(0);

    const req = new NextRequest("http://localhost/api/polls?page=-5");
    await GET(req);

    expect(mockPrisma.poll.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0 }),
    );
  });
});
