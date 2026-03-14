import { describe, it, expect, vi, afterEach } from "vitest";
import {
  createPollSchema,
  isPollExpired,
  formatDuration,
  formatTimeRemaining,
  QUESTION_MAX_LENGTH,
  ANSWER_MAX_LENGTH,
  ANSWERS_MIN,
  ANSWERS_MAX,
  DURATION_MIN,
  DURATION_MAX,
  DURATION_DEFAULT,
  DURATION_PRESETS,
} from "./poll-schema";

describe("isPollExpired", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns false when maxDuration is null", () => {
    expect(isPollExpired(new Date(), null)).toBe(false);
  });

  it("returns false when poll is still within duration", () => {
    vi.useFakeTimers();
    const now = new Date("2025-01-01T12:00:00Z");
    vi.setSystemTime(now);

    const created = new Date("2025-01-01T11:00:00Z");
    expect(isPollExpired(created, 7200)).toBe(false);
  });

  it("returns true when poll has exceeded duration", () => {
    vi.useFakeTimers();
    const now = new Date("2025-01-01T14:00:00Z");
    vi.setSystemTime(now);

    const created = new Date("2025-01-01T12:00:00Z");
    expect(isPollExpired(created, 3600)).toBe(true);
  });

  it("accepts createdAt as an ISO string", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T14:00:00Z"));

    expect(isPollExpired("2025-01-01T12:00:00Z", 3600)).toBe(true);
    expect(isPollExpired("2025-01-01T13:30:00Z", 3600)).toBe(false);
  });

  it("returns true at exact expiry boundary", () => {
    vi.useFakeTimers();
    const created = new Date("2025-01-01T12:00:00Z");
    vi.setSystemTime(new Date(created.getTime() + 3600 * 1000 + 1));

    expect(isPollExpired(created, 3600)).toBe(true);
  });
});

describe("formatDuration", () => {
  it("formats seconds into days, hours, minutes", () => {
    expect(formatDuration(90061)).toBe("1d 1h 1m");
  });

  it("returns only relevant parts", () => {
    expect(formatDuration(3600)).toBe("1h");
    expect(formatDuration(86400)).toBe("1d");
    expect(formatDuration(1800)).toBe("30m");
  });

  it("returns '0m' for zero seconds", () => {
    expect(formatDuration(0)).toBe("0m");
  });

  it("handles multi-day durations", () => {
    expect(formatDuration(7 * 86400)).toBe("7d");
  });

  it("handles combined hours and minutes", () => {
    expect(formatDuration(5400)).toBe("1h 30m");
  });
});

describe("formatTimeRemaining", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns remaining time as formatted string", () => {
    vi.useFakeTimers();
    const created = new Date("2025-01-01T12:00:00Z");
    vi.setSystemTime(new Date("2025-01-01T12:30:00Z"));

    expect(formatTimeRemaining(created, 7200)).toBe("1h 30m");
  });

  it("returns 'Expired' when time has run out", () => {
    vi.useFakeTimers();
    const created = new Date("2025-01-01T12:00:00Z");
    vi.setSystemTime(new Date("2025-01-01T14:00:01Z"));

    expect(formatTimeRemaining(created, 7200)).toBe("Expired");
  });

  it("accepts createdAt as a string", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T12:30:00Z"));

    expect(formatTimeRemaining("2025-01-01T12:00:00Z", 7200)).toBe("1h 30m");
  });
});

describe("createPollSchema", () => {
  const validInput = {
    question: "Favorite color?",
    answers: ["Red", "Blue"],
  };

  it("accepts valid input with defaults", () => {
    const result = createPollSchema.parse(validInput);
    expect(result.question).toBe("Favorite color?");
    expect(result.answers).toEqual(["Red", "Blue"]);
    expect(result.duration).toBe(DURATION_DEFAULT);
  });

  it("accepts custom  duration", () => {
    const result = createPollSchema.parse({
      ...validInput,
      duration: 3600,
    });
    expect(result.duration).toBe(3600);
  });

  it("rejects empty question", () => {
    expect(() =>
      createPollSchema.parse({ ...validInput, question: "" }),
    ).toThrow();
  });

  it("rejects question exceeding max length", () => {
    expect(() =>
      createPollSchema.parse({
        ...validInput,
        question: "a".repeat(QUESTION_MAX_LENGTH + 1),
      }),
    ).toThrow();
  });

  it("accepts question at max length", () => {
    const result = createPollSchema.parse({
      ...validInput,
      question: "a".repeat(QUESTION_MAX_LENGTH),
    });
    expect(result.question).toHaveLength(QUESTION_MAX_LENGTH);
  });

  it("rejects fewer than ANSWERS_MIN answers", () => {
    expect(() =>
      createPollSchema.parse({ ...validInput, answers: ["Only one"] }),
    ).toThrow();
  });

  it("rejects more than ANSWERS_MAX answers", () => {
    const tooMany = Array.from({ length: ANSWERS_MAX + 1 }, (_, i) => `A${i}`);
    expect(() =>
      createPollSchema.parse({ ...validInput, answers: tooMany }),
    ).toThrow();
  });

  it("rejects empty answer strings", () => {
    expect(() =>
      createPollSchema.parse({ ...validInput, answers: ["Valid", ""] }),
    ).toThrow();
  });

  it("rejects answers exceeding max length", () => {
    expect(() =>
      createPollSchema.parse({
        ...validInput,
        answers: ["ok", "a".repeat(ANSWER_MAX_LENGTH + 1)],
      }),
    ).toThrow();
  });

  it("rejects duration below minimum", () => {
    expect(() =>
      createPollSchema.parse({ ...validInput, duration: DURATION_MIN - 1 }),
    ).toThrow();
  });

  it("rejects duration above maximum", () => {
    expect(() =>
      createPollSchema.parse({ ...validInput, duration: DURATION_MAX + 1 }),
    ).toThrow();
  });
});

describe("constants", () => {
  it("has consistent DURATION_DEFAULT in presets", () => {
    const presetValues = DURATION_PRESETS.map((p) => p.value);
    expect(presetValues).toContain(DURATION_DEFAULT);
  });

  it("has DURATION_PRESETS ordered ascending", () => {
    for (let i = 1; i < DURATION_PRESETS.length; i++) {
      expect(DURATION_PRESETS[i].value).toBeGreaterThan(
        DURATION_PRESETS[i - 1].value,
      );
    }
  });

  it("has ANSWERS_MIN less than ANSWERS_MAX", () => {
    expect(ANSWERS_MIN).toBeLessThan(ANSWERS_MAX);
  });
});
