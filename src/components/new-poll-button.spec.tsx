// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { NewPollButton } from "./new-poll-button";

const mockPathname = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
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

afterEach(() => {
  vi.clearAllMocks();
});

describe("NewPollButton", () => {
  it("renders nothing when on the home page", () => {
    mockPathname.mockReturnValue("/");
    const { container } = render(<NewPollButton />);
    expect(container.innerHTML).toBe("");
  });

  it("renders a link to home when on a poll page", () => {
    mockPathname.mockReturnValue("/poll/abc-123");
    render(<NewPollButton />);

    const el = screen.getByRole("button", { name: /new poll/i });
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute("href", "/");
  });
});
