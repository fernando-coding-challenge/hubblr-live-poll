// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Home from "./page";
import { ANSWERS_MAX, DURATION_PRESETS } from "@/lib/poll-schema";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

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

vi.mock("@/components/poll-list", () => ({
  PollList: () => <div data-testid="poll-list">Poll List</div>,
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("Home (Create Poll page)", () => {
  it("renders the page heading", () => {
    render(<Home />, { wrapper });
    expect(screen.getByText("Create a new poll")).toBeInTheDocument();
  });

  it("renders the poll list sidebar", () => {
    render(<Home />, { wrapper });
    expect(screen.getByTestId("poll-list")).toBeInTheDocument();
  });

  it("renders question input", () => {
    render(<Home />, { wrapper });
    expect(
      screen.getByPlaceholderText("What do you want to ask?"),
    ).toBeInTheDocument();
  });

  it("renders two answer inputs by default", () => {
    render(<Home />, { wrapper });
    expect(screen.getByPlaceholderText("Answer 1")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Answer 2")).toBeInTheDocument();
  });

  it("can add a new answer", async () => {
    const user = userEvent.setup();
    render(<Home />, { wrapper });

    await user.click(screen.getByText("Add new item"));
    expect(screen.getByPlaceholderText("Answer 3")).toBeInTheDocument();
  });

  it("disables 'Add new item' at ANSWERS_MAX", async () => {
    const user = userEvent.setup();
    render(<Home />, { wrapper });

    for (let i = 2; i < ANSWERS_MAX; i++) {
      await user.click(screen.getByText("Add new item"));
    }

    expect(screen.getByText("Add new item").closest("button")).toBeDisabled();
  });

  it("can remove an answer", async () => {
    const user = userEvent.setup();
    render(<Home />, { wrapper });

    await user.click(screen.getByText("Add new item"));
    expect(screen.getByPlaceholderText("Answer 3")).toBeInTheDocument();

    const deleteButtons = screen
      .getAllByRole("button")
      .filter((btn) => !btn.textContent || btn.querySelector("svg"));
    const enabledDeleteBtn = deleteButtons.find(
      (btn) => !btn.hasAttribute("disabled"),
    );
    if (enabledDeleteBtn) await user.click(enabledDeleteBtn);

    await waitFor(() =>
      expect(screen.queryByPlaceholderText("Answer 3")).not.toBeInTheDocument(),
    );
  });

  it("renders all duration presets", () => {
    render(<Home />, { wrapper });
    for (const preset of DURATION_PRESETS) {
      expect(screen.getByText(preset.label)).toBeInTheDocument();
    }
  });

  it("shows 7 days preset as selected by default", () => {
    render(<Home />, { wrapper });
    const sevenDays = screen.getByText("7 days");
    expect(sevenDays.closest("button")).toHaveClass("ring-2");
  });

  it("can select a different duration", async () => {
    const user = userEvent.setup();
    render(<Home />, { wrapper });

    await user.click(screen.getByText("1 hour"));
    expect(screen.getByText("1 hour").closest("button")).toHaveClass("ring-2");
  });

  it("marks empty inputs as invalid on initial render", () => {
    render(<Home />, { wrapper });
    const question = screen.getByPlaceholderText("What do you want to ask?");
    const answer1 = screen.getByPlaceholderText("Answer 1");
    const answer2 = screen.getByPlaceholderText("Answer 2");

    expect(question).toHaveAttribute("aria-invalid", "true");
    expect(answer1).toHaveAttribute("aria-invalid", "true");
    expect(answer2).toHaveAttribute("aria-invalid", "true");
  });

  it("clears invalid state when inputs are filled", async () => {
    const user = userEvent.setup();
    render(<Home />, { wrapper });

    const question = screen.getByPlaceholderText("What do you want to ask?");
    await user.type(question, "Hello?");
    expect(question).toHaveAttribute("aria-invalid", "false");
  });

  it("disables submit button when fields are empty", () => {
    render(<Home />, { wrapper });
    expect(screen.getByText("Create poll").closest("button")).toBeDisabled();
  });

  it("submits the form and navigates to the new poll", async () => {
    const user = userEvent.setup();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: "new-poll-id" }),
      }),
    );

    render(<Home />, { wrapper });

    await user.type(
      screen.getByPlaceholderText("What do you want to ask?"),
      "Best language?",
    );
    await user.type(screen.getByPlaceholderText("Answer 1"), "TypeScript");
    await user.type(screen.getByPlaceholderText("Answer 2"), "Rust");

    const submitButton = screen.getByText("Create poll");
    await waitFor(() =>
      expect(submitButton.closest("button")).not.toBeDisabled(),
    );
    await user.click(submitButton);

    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith("/poll/new-poll-id"),
    );
  });

  it("shows error message when creation fails", async () => {
    const user = userEvent.setup();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "Server error" }),
      }),
    );

    render(<Home />, { wrapper });

    await user.type(
      screen.getByPlaceholderText("What do you want to ask?"),
      "Test question?",
    );
    await user.type(screen.getByPlaceholderText("Answer 1"), "A");
    await user.type(screen.getByPlaceholderText("Answer 2"), "B");

    const submitButton = screen.getByText("Create poll");
    await waitFor(() =>
      expect(submitButton.closest("button")).not.toBeDisabled(),
    );
    await user.click(submitButton);

    await waitFor(() =>
      expect(screen.getByText("Server error")).toBeInTheDocument(),
    );
  });
});
