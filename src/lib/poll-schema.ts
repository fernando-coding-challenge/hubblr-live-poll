import { z } from "zod";

export const QUESTION_MAX_LENGTH = 255;
export const ANSWER_MAX_LENGTH = 255;
export const ANSWERS_MIN = 2;
export const ANSWERS_MAX = 5;

export const DURATION_MIN = 30 * 60;
export const DURATION_MAX = 7 * 24 * 60 * 60;
export const DURATION_DEFAULT = DURATION_MAX;

export const DURATION_PRESETS = [
  { label: "30 min", value: 30 * 60 },
  { label: "1 hour", value: 60 * 60 },
  { label: "3 hours", value: 3 * 60 * 60 },
  { label: "6 hours", value: 6 * 60 * 60 },
  { label: "12 hours", value: 12 * 60 * 60 },
  { label: "1 day", value: 24 * 60 * 60 },
  { label: "2 days", value: 2 * 24 * 60 * 60 },
  { label: "3 days", value: 3 * 24 * 60 * 60 },
  { label: "5 days", value: 5 * 24 * 60 * 60 },
  { label: "7 days", value: 7 * 24 * 60 * 60 },
] as const;

export const createPollSchema = z.object({
  question: z.string().min(1).max(QUESTION_MAX_LENGTH),
  answers: z
    .array(z.string().min(1).max(ANSWER_MAX_LENGTH))
    .min(ANSWERS_MIN)
    .max(ANSWERS_MAX),
  duration: z
    .number()
    .int()
    .min(DURATION_MIN)
    .max(DURATION_MAX)
    .default(DURATION_DEFAULT),
});

export type CreatePollInput = z.infer<typeof createPollSchema>;

export function isPollExpired(
  createdAt: Date | string,
  maxDuration: number | null,
): boolean {
  if (maxDuration == null) return false;
  const created =
    typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  return created.getTime() + maxDuration * 1000 < Date.now();
}

export function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  return parts.join(" ") || "0m";
}

export function formatTimeRemaining(
  createdAt: Date | string,
  maxDuration: number,
): string {
  const created =
    typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  const expiresAt = created.getTime() + maxDuration * 1000;
  const remaining = expiresAt - Date.now();
  if (remaining <= 0) return "Expired";
  return formatDuration(Math.floor(remaining / 1000));
}
