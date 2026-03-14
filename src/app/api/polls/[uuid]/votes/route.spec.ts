import { describe, it, expect, vi, beforeEach } from "vitest";
import { StatusCodes } from "http-status-codes";

const mockPrisma = {
  poll: {
    findUnique: vi.fn(),
  },
  pollAnswer: {
    findFirst: vi.fn(),
  },
  vote: {
    create: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

const { POST } = await import("./route");

const POLL_UUID = "11111111-1111-4111-8111-111111111111";
const ANSWER_UUID = "22222222-2222-4222-8222-222222222222";

function jsonRequest(body: unknown) {
  return new Request(`http://localhost/api/polls/${POLL_UUID}/votes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeParams(uuid: string) {
  return { params: Promise.resolve({ uuid }) };
}

describe("POST /api/polls/[uuid]/votes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a vote and returns 201", async () => {
    mockPrisma.poll.findUnique.mockResolvedValue({
      createdAt: new Date(),
      maxDuration: 86400,
    });
    mockPrisma.pollAnswer.findFirst.mockResolvedValue({
      id: ANSWER_UUID,
      pollId: POLL_UUID,
    });
    mockPrisma.vote.create.mockResolvedValue({ id: "vote-id" });

    const res = await POST(
      jsonRequest({ answerId: ANSWER_UUID }),
      makeParams(POLL_UUID),
    );

    expect(res.status).toBe(StatusCodes.CREATED);
    expect(await res.json()).toEqual({ id: "vote-id" });
    expect(mockPrisma.vote.create).toHaveBeenCalledWith({
      data: { pollId: POLL_UUID, selectedAnswerId: ANSWER_UUID },
    });
  });

  it("returns 400 for invalid JSON", async () => {
    const req = new Request(`http://localhost/api/polls/${POLL_UUID}/votes`, {
      method: "POST",
      body: "bad",
    });

    const res = await POST(req, makeParams(POLL_UUID));
    expect(res.status).toBe(StatusCodes.BAD_REQUEST);
    expect(await res.json()).toEqual({ error: "Invalid JSON" });
  });

  it("returns 400 when answerId is not a valid UUID", async () => {
    const res = await POST(
      jsonRequest({ answerId: "not-a-uuid" }),
      makeParams(POLL_UUID),
    );

    expect(res.status).toBe(StatusCodes.BAD_REQUEST);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
  });

  it("returns 404 when poll does not exist", async () => {
    mockPrisma.poll.findUnique.mockResolvedValue(null);

    const res = await POST(
      jsonRequest({ answerId: ANSWER_UUID }),
      makeParams(POLL_UUID),
    );

    expect(res.status).toBe(StatusCodes.NOT_FOUND);
    expect(await res.json()).toEqual({ error: "Poll not found" });
  });

  it("returns 410 when poll has expired", async () => {
    mockPrisma.poll.findUnique.mockResolvedValue({
      createdAt: new Date("2020-01-01"),
      maxDuration: 60,
    });

    const res = await POST(
      jsonRequest({ answerId: ANSWER_UUID }),
      makeParams(POLL_UUID),
    );

    expect(res.status).toBe(StatusCodes.GONE);
    const body = await res.json();
    expect(body.error).toMatch(/expired/i);
  });

  it("returns 400 when answer does not belong to poll", async () => {
    mockPrisma.poll.findUnique.mockResolvedValue({
      createdAt: new Date(),
      maxDuration: 86400,
    });
    mockPrisma.pollAnswer.findFirst.mockResolvedValue(null);

    const res = await POST(
      jsonRequest({ answerId: ANSWER_UUID }),
      makeParams(POLL_UUID),
    );

    expect(res.status).toBe(StatusCodes.BAD_REQUEST);
    const body = await res.json();
    expect(body.error).toMatch(/does not belong/i);
  });
});
