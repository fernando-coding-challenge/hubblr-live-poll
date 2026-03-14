import { describe, it, expect, vi, beforeEach } from "vitest";
import { StatusCodes } from "http-status-codes";

const mockPrisma = {
  poll: {
    findUnique: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

const { GET } = await import("./route");

function makeParams(uuid: string) {
  return { params: Promise.resolve({ uuid }) };
}

describe("GET /api/polls/[uuid]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the poll when found", async () => {
    const fakePoll = {
      id: "abc-123",
      question: "Favorite color?",
      createdAt: new Date("2026-01-01"),
      maxDuration: 3600,
      answers: [
        { id: "a1", answer: "Red", _count: { votes: 3 } },
        { id: "a2", answer: "Blue", _count: { votes: 5 } },
      ],
      _count: { votes: 8 },
    };
    mockPrisma.poll.findUnique.mockResolvedValue(fakePoll);

    const req = new Request("http://localhost/api/polls/abc-123");
    const res = await GET(req, makeParams("abc-123"));

    expect(res.status).toBe(StatusCodes.OK);
    const body = await res.json();
    expect(body.question).toBe("Favorite color?");
    expect(body.answers).toHaveLength(2);
  });

  it("returns 404 when poll not found", async () => {
    mockPrisma.poll.findUnique.mockResolvedValue(null);

    const req = new Request("http://localhost/api/polls/nonexistent");
    const res = await GET(req, makeParams("nonexistent"));

    expect(res.status).toBe(StatusCodes.NOT_FOUND);
    expect(await res.json()).toEqual({ error: "Poll not found" });
  });

  it("queries prisma with the correct uuid", async () => {
    mockPrisma.poll.findUnique.mockResolvedValue(null);

    const req = new Request("http://localhost/api/polls/my-uuid");
    await GET(req, makeParams("my-uuid"));

    expect(mockPrisma.poll.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "my-uuid" } }),
    );
  });
});
