// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PollView } from "./poll-view";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const UUID = "test-poll-123";

function makePoll(overrides: Record<string, unknown> = {}) {
  return {
    id: UUID,
    question: "Favorite color?",
    createdAt: new Date().toISOString(),
    maxDuration: null,
    answers: [
      { id: "a1", answer: "Red", _count: { votes: 3 } },
      { id: "a2", answer: "Blue", _count: { votes: 5 } },
    ],
    _count: { votes: 8 },
    ...overrides,
  };
}

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchInterval: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PollView", () => {
  it("shows loading spinner while fetching", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {})),
    );

    render(<PollView uuid={UUID} />, { wrapper });
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("shows error message and retry button on fetch failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "Not found" }),
      }),
    );

    render(<PollView uuid={UUID} />, { wrapper });
    await waitFor(() =>
      expect(screen.getByText("Not found")).toBeInTheDocument(),
    );
    expect(screen.getByText("Try again")).toBeInTheDocument();
  });

  it("renders poll question and answer options", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(makePoll()),
      }),
    );

    render(<PollView uuid={UUID} />, { wrapper });
    await waitFor(() =>
      expect(screen.getByText("Favorite color?")).toBeInTheDocument(),
    );
    expect(screen.getByText("Red")).toBeInTheDocument();
    expect(screen.getByText("Blue")).toBeInTheDocument();
  });

  it("shows vote count", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(makePoll()),
      }),
    );

    render(<PollView uuid={UUID} />, { wrapper });
    await waitFor(() =>
      expect(screen.getByText("8 votes")).toBeInTheDocument(),
    );
  });

  it("shows singular 'vote' for 1 total vote", async () => {
    const poll = makePoll({
      answers: [
        { id: "a1", answer: "Red", _count: { votes: 1 } },
        { id: "a2", answer: "Blue", _count: { votes: 0 } },
      ],
      _count: { votes: 1 },
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(poll),
      }),
    );

    render(<PollView uuid={UUID} />, { wrapper });
    await waitFor(() => expect(screen.getByText("1 vote")).toBeInTheDocument());
  });

  it("disables vote button when no option is selected", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(makePoll()),
      }),
    );

    render(<PollView uuid={UUID} />, { wrapper });
    await waitFor(() => expect(screen.getByText("Vote")).toBeInTheDocument());
    expect(screen.getByText("Vote").closest("button")).toBeDisabled();
  });

  it("shows expired badge for expired polls", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2025-06-01T12:00:00Z"));

    const poll = makePoll({
      createdAt: "2025-06-01T10:00:00Z",
      maxDuration: 3600,
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(poll),
      }),
    );

    render(<PollView uuid={UUID} />, { wrapper });
    await waitFor(() =>
      expect(screen.getByText("Expired")).toBeInTheDocument(),
    );

    vi.useRealTimers();
  });

  it("shows results bars for expired polls instead of radio buttons", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2025-06-01T12:00:00Z"));

    const poll = makePoll({
      createdAt: "2025-06-01T10:00:00Z",
      maxDuration: 3600,
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(poll),
      }),
    );

    render(<PollView uuid={UUID} />, { wrapper });
    await waitFor(() =>
      expect(screen.getByText("Favorite color?")).toBeInTheDocument(),
    );

    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.getByText(/38%/)).toBeInTheDocument();
    expect(screen.getByText(/63%/)).toBeInTheDocument();

    vi.useRealTimers();
  });

  it("shows time remaining badge for active polls with duration", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2025-06-01T10:00:00Z"));

    const poll = makePoll({
      createdAt: "2025-06-01T10:00:00Z",
      maxDuration: 7200,
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(poll),
      }),
    );

    render(<PollView uuid={UUID} />, { wrapper });
    await waitFor(() => {
      const badge = screen.getByText(/left/);
      expect(badge).toBeInTheDocument();
      expect(badge.textContent).toMatch(/\dh \d+m left/);
    });

    vi.useRealTimers();
  });

  it("submits a vote and shows results", async () => {
    const user = userEvent.setup();
    const poll = makePoll();
    let callCount = 0;

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
        if (init?.method === "POST") {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ id: "vote-1" }),
          });
        }
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(poll),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve(
              makePoll({
                answers: [
                  { id: "a1", answer: "Red", _count: { votes: 4 } },
                  { id: "a2", answer: "Blue", _count: { votes: 5 } },
                ],
                _count: { votes: 9 },
              }),
            ),
        });
      }),
    );

    render(<PollView uuid={UUID} />, { wrapper });
    await waitFor(() => expect(screen.getByText("Vote")).toBeInTheDocument());

    const radios = screen.getAllByRole("radio");
    await user.click(radios[0]);

    const voteButton = screen.getByText("Vote").closest("button")!;
    await user.click(voteButton);

    await waitFor(() =>
      expect(screen.queryByText("Vote")).not.toBeInTheDocument(),
    );
  });

  it("shows vote error message on submission failure", async () => {
    const user = userEvent.setup();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
        if (init?.method === "POST") {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: "Already voted" }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(makePoll()),
        });
      }),
    );

    render(<PollView uuid={UUID} />, { wrapper });
    await waitFor(() => expect(screen.getByText("Vote")).toBeInTheDocument());

    const radios = screen.getAllByRole("radio");
    await user.click(radios[0]);

    const voteButton = screen.getByText("Vote").closest("button")!;
    await user.click(voteButton);

    await waitFor(() =>
      expect(screen.getByText("Already voted")).toBeInTheDocument(),
    );
  });
});
