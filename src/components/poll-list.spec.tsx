// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PollList } from "./poll-list";

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

function makePage(
  polls: { id: string; question: string }[],
  meta = { page: 1, pageSize: 10, total: polls.length, totalPages: 1 },
) {
  return { data: polls, meta };
}

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PollList", () => {
  it("shows loading spinner initially", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {})),
    );

    render(<PollList />, { wrapper });
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("shows error message on fetch failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    );

    render(<PollList />, { wrapper });
    await waitFor(() =>
      expect(screen.getByText("Failed to load polls.")).toBeInTheDocument(),
    );
  });

  it("shows empty state when no polls exist", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(makePage([])),
      }),
    );

    render(<PollList />, { wrapper });
    await waitFor(() =>
      expect(screen.getByText("No polls yet. Create one!")).toBeInTheDocument(),
    );
  });

  it("renders poll links", async () => {
    const polls = [
      { id: "abc-123", question: "Favorite color?" },
      { id: "def-456", question: "Best framework?" },
    ];

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(makePage(polls)),
      }),
    );

    render(<PollList />, { wrapper });

    await waitFor(() =>
      expect(screen.getByText("Favorite color?")).toBeInTheDocument(),
    );
    expect(screen.getByText("Best framework?")).toBeInTheDocument();

    const link = screen.getByText("Favorite color?").closest("a");
    expect(link).toHaveAttribute("href", "/poll/abc-123");
  });

  it("shows total count badge", async () => {
    const polls = [{ id: "1", question: "Q1?" }];

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve(
            makePage(polls, { page: 1, pageSize: 10, total: 1, totalPages: 1 }),
          ),
      }),
    );

    render(<PollList />, { wrapper });
    await waitFor(() => expect(screen.getByText("1 poll")).toBeInTheDocument());
  });

  it("pluralizes the poll count correctly", async () => {
    const polls = [
      { id: "1", question: "Q1?" },
      { id: "2", question: "Q2?" },
    ];

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve(
            makePage(polls, { page: 1, pageSize: 10, total: 2, totalPages: 1 }),
          ),
      }),
    );

    render(<PollList />, { wrapper });
    await waitFor(() =>
      expect(screen.getByText("2 polls")).toBeInTheDocument(),
    );
  });
});
