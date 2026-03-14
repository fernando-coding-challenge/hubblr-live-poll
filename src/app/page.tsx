"use client";

import { useState } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { PollList } from "@/components/poll-list";
import { Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  QUESTION_MAX_LENGTH,
  ANSWER_MAX_LENGTH,
  ANSWERS_MIN,
  ANSWERS_MAX,
  DURATION_DEFAULT,
  DURATION_PRESETS,
} from "@/lib/poll-schema";

interface PollFormValues {
  question: string;
  answers: { value: string }[];
  duration?: number;
}

async function createPoll(data: PollFormValues) {
  const res = await fetch("/api/polls", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: data.question,
      answers: data.answers.map((a) => a.value),
      duration: data.duration,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "Failed to create poll");
  }

  return res.json() as Promise<{ id: string }>;
}

export default function Home() {
  const router = useRouter();
  const [duration, setDuration] = useState(DURATION_DEFAULT);

  const { register, control, handleSubmit } = useForm<PollFormValues>({
    defaultValues: {
      question: "",
      // 2 answers by default
      answers: [{ value: "" }, { value: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "answers",
  });

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createPoll,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["polls"] });
      // redirect to the new poll
      router.push(`/poll/${data.id}`);
    },
  });

  const canAddMore = fields.length < ANSWERS_MAX;
  const canDelete = fields.length > ANSWERS_MIN;

  const watched = useWatch({ control });

  const isQuestionInvalid =
    !watched.question?.trim() || watched.question.length > QUESTION_MAX_LENGTH;

  const isAnswerInvalid = (index: number) => {
    const a = watched.answers?.[index];
    return !a?.value?.trim() || a.value.length > ANSWER_MAX_LENGTH;
  };

  const hasInvalidAnswers = watched.answers?.some(
    (a) => !a.value?.trim() || a.value.length > ANSWER_MAX_LENGTH,
  );

  const validationIssues: string[] = [];

  if (!watched.question?.trim()) {
    validationIssues.push("Question is required");
  } else if (watched.question.length > QUESTION_MAX_LENGTH) {
    validationIssues.push(
      `Question must be at most ${QUESTION_MAX_LENGTH} characters`,
    );
  }

  const answers = watched.answers ?? [];
  if (answers.length < ANSWERS_MIN) {
    validationIssues.push(`At least ${ANSWERS_MIN} answers are required`);
  }
  if (answers.length > ANSWERS_MAX) {
    validationIssues.push(`At most ${ANSWERS_MAX} answers are allowed`);
  }

  answers.forEach((a, i) => {
    if (!a.value?.trim()) {
      validationIssues.push(`Answer ${i + 1} is required`);
    } else if (a.value.length > ANSWER_MAX_LENGTH) {
      validationIssues.push(
        `Answer ${i + 1} must be at most ${ANSWER_MAX_LENGTH} characters`,
      );
    }
  });

  const nonEmptyValues = answers
    .map((a) => a.value?.trim().toLowerCase())
    .filter(Boolean);
  const seen = new Set<string>();
  for (const v of nonEmptyValues) {
    if (v && seen.has(v)) {
      validationIssues.push("Duplicate answers are not allowed");
      break;
    }
    if (v) seen.add(v);
  }

  const canSubmit = !isQuestionInvalid && !hasInvalidAnswers;

  return (
    <div className="flex gap-0">
      <aside className="min-h-0 w-72 shrink-0">
        <PollList />
      </aside>

      <Separator orientation="vertical" className="mx-8" />

      <main className="flex-1">
        <h2 className="mb-6 scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">
          Create a new poll
        </h2>

        <form
          onSubmit={handleSubmit((data) =>
            mutation.mutate({ ...data, duration }),
          )}
          className="space-y-6"
        >
          <div className="space-y-1.5">
            <Label htmlFor="question">Question</Label>
            <Input
              id="question"
              placeholder="What do you want to ask?"
              aria-invalid={isQuestionInvalid}
              {...register("question")}
            />
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm leading-none font-medium">
              Answers
            </legend>

            {fields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-2">
                <div className="flex-1 space-y-1">
                  <Input
                    placeholder={`Answer ${index + 1}`}
                    aria-invalid={isAnswerInvalid(index)}
                    {...register(`answers.${index}.value`)}
                  />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  disabled={!canDelete}
                  onClick={() => remove(index)}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              disabled={!canAddMore}
              onClick={() => append({ value: "" })}
            >
              Add new item
            </Button>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm leading-none font-medium">
              Duration
            </legend>
            <div className="flex flex-wrap gap-2">
              {DURATION_PRESETS.map((preset) => (
                <Button
                  key={preset.value}
                  type="button"
                  size="sm"
                  variant={duration === preset.value ? "default" : "outline"}
                  className={cn(
                    "min-w-18 transition-all",
                    duration === preset.value && "ring-2 ring-primary/30",
                  )}
                  onClick={() => setDuration(preset.value)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </fieldset>

          {mutation.error && (
            <p className="text-destructive text-sm">{mutation.error.message}</p>
          )}

          {validationIssues.length > 0 && (
            <ul className="space-y-1 text-destructive text-sm list-disc pl-4">
              {validationIssues.map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
          )}

          <Button
            size="lg"
            type="submit"
            disabled={!canSubmit || mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="animate-spin" />}
            {mutation.isPending ? "Creating..." : "Create poll"}
          </Button>
        </form>
      </main>
    </div>
  );
}
