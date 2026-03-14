import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

const HOUR = 60 * 60;
const DAY = 24 * HOUR;

const durations = [
  30 * 60,
  HOUR,
  3 * HOUR,
  6 * HOUR,
  12 * HOUR,
  DAY,
  2 * DAY,
  3 * DAY,
  5 * DAY,
  7 * DAY,
];

const pollTemplates: { question: string; answers: string[] }[] = [
  {
    question: "What is your favorite programming language?",
    answers: ["TypeScript", "Python", "Rust", "Go", "Java"],
  },
  {
    question: "Best frontend framework in 2026?",
    answers: ["Next.js", "Nuxt", "SvelteKit", "Astro"],
  },
  {
    question: "Dark mode or light mode?",
    answers: ["Dark mode", "Light mode"],
  },
  {
    question: "Which cloud provider do you use the most?",
    answers: ["AWS", "GCP", "Azure", "Vercel"],
  },
  { question: "Tabs or spaces?", answers: ["Tabs", "Spaces"] },
  {
    question: "Favorite code editor?",
    answers: ["VS Code", "Neovim", "Zed", "IntelliJ", "Emacs"],
  },
  {
    question: "Best database for a new project?",
    answers: ["PostgreSQL", "SQLite", "MySQL", "MongoDB"],
  },
  {
    question: "Which OS do you develop on?",
    answers: ["macOS", "Linux", "Windows"],
  },
  {
    question: "Preferred package manager?",
    answers: ["npm", "pnpm", "yarn", "bun"],
  },
  {
    question: "REST or GraphQL?",
    answers: ["REST", "GraphQL", "tRPC", "gRPC"],
  },
  { question: "Monorepo or polyrepo?", answers: ["Monorepo", "Polyrepo"] },
  {
    question: "CSS approach?",
    answers: [
      "Tailwind CSS",
      "CSS Modules",
      "Styled Components",
      "Vanilla CSS",
    ],
  },
  {
    question: "Best CI/CD platform?",
    answers: ["GitHub Actions", "GitLab CI", "CircleCI", "Jenkins"],
  },
  {
    question: "Favorite terminal?",
    answers: ["iTerm2", "Warp", "Kitty", "Alacritty", "Ghostty"],
  },
  {
    question: "How do you manage state in React?",
    answers: ["useState/useReducer", "Zustand", "Redux", "Jotai"],
  },
  {
    question: "Preferred testing framework?",
    answers: ["Vitest", "Jest", "Playwright", "Cypress"],
  },
  { question: "How many monitors do you use?", answers: ["1", "2", "3+"] },
  {
    question: "Favorite AI coding assistant?",
    answers: ["Cursor", "GitHub Copilot", "Codeium", "None"],
  },
  {
    question: "Do you use TypeScript strict mode?",
    answers: ["Yes, always", "Sometimes", "No"],
  },
  {
    question: "Preferred deployment target?",
    answers: ["Vercel", "AWS", "Fly.io", "Cloudflare", "Self-hosted"],
  },
  {
    question: "Favorite Git branching strategy?",
    answers: ["Trunk-based", "Git Flow", "GitHub Flow"],
  },
  {
    question: "Do you write tests?",
    answers: ["Always", "Most of the time", "Rarely", "Never"],
  },
  {
    question: "Preferred auth solution?",
    answers: ["NextAuth", "Clerk", "Auth0", "Custom"],
  },
  {
    question: "Favorite type of coffee?",
    answers: ["Espresso", "Latte", "Americano", "No coffee", "Tea"],
  },
  {
    question: "Remote, hybrid, or office?",
    answers: ["Remote", "Hybrid", "Office"],
  },
  {
    question: "How long have you been coding?",
    answers: ["< 1 year", "1-3 years", "3-5 years", "5-10 years", "10+ years"],
  },
  {
    question: "Keyboard layout?",
    answers: ["QWERTY", "Dvorak", "Colemak", "Other"],
  },
  {
    question: "Light or mechanical keyboard?",
    answers: ["Mechanical", "Membrane", "Laptop keyboard"],
  },
  {
    question: "Favorite container tool?",
    answers: ["Docker", "Podman", "Neither"],
  },
  {
    question: "Preferred ORM?",
    answers: ["Prisma", "Drizzle", "TypeORM", "Knex", "Raw SQL"],
  },
  {
    question: "How do you learn new tech?",
    answers: ["Docs", "YouTube", "Courses", "Books", "Just build stuff"],
  },
  {
    question: "Favorite browser for dev?",
    answers: ["Chrome", "Firefox", "Arc", "Safari", "Edge"],
  },
  {
    question: "Do you use a linter?",
    answers: ["ESLint", "Biome", "Both", "None"],
  },
  {
    question: "Best language for backend?",
    answers: ["TypeScript", "Go", "Python", "Rust", "Java"],
  },
  {
    question: "Favorite open-source license?",
    answers: ["MIT", "Apache 2.0", "GPL", "ISC", "Don't care"],
  },
  {
    question: "How often do you refactor?",
    answers: ["Constantly", "Weekly", "Monthly", "Only when forced"],
  },
  {
    question: "Preferred API documentation tool?",
    answers: ["Swagger/OpenAPI", "Postman", "README", "None"],
  },
  {
    question: "Vim keybindings?",
    answers: ["Yes, everywhere", "Only in the editor", "No thanks"],
  },
  {
    question: "Favorite CSS framework?",
    answers: ["Tailwind", "Bootstrap", "Bulma", "None"],
  },
  {
    question: "Do you use AI for code review?",
    answers: ["Yes", "No", "Sometimes"],
  },
  {
    question: "Favorite way to handle errors?",
    answers: ["Try/catch", "Result types", "Error boundaries", "Let it crash"],
  },
  {
    question: "Meetings per week?",
    answers: ["0-2", "3-5", "6-10", "Too many"],
  },
  {
    question: "Favorite social platform for devs?",
    answers: ["Twitter/X", "Bluesky", "Reddit", "Hacker News", "Mastodon"],
  },
  {
    question: "Do you contribute to open source?",
    answers: ["Regularly", "Occasionally", "Rarely", "Never"],
  },
  {
    question: "Serif or sans-serif for coding?",
    answers: ["Sans-serif", "Monospace only", "Serif actually"],
  },
  {
    question: "Favorite Node.js runtime?",
    answers: ["Node.js", "Bun", "Deno"],
  },
  {
    question: "How do you manage secrets?",
    answers: [".env files", "Vault", "Cloud provider", "1Password"],
  },
  {
    question: "Favorite diagramming tool?",
    answers: ["Excalidraw", "Mermaid", "Figma", "Pen and paper"],
  },
  {
    question: "Preferred logging approach?",
    answers: ["console.log", "Structured logging", "Observability platform"],
  },
  {
    question: "Favorite font for coding?",
    answers: [
      "JetBrains Mono",
      "Fira Code",
      "SF Mono",
      "Cascadia Code",
      "Other",
    ],
  },
];

async function main() {
  await prisma.vote.deleteMany();
  await prisma.pollAnswer.deleteMany();
  await prisma.poll.deleteMany();

  const now = Date.now();
  const rand = seededRandom(42);
  const pick = <T>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
  const randInt = (min: number, max: number) =>
    Math.floor(rand() * (max - min + 1)) + min;

  const POLL_COUNT = 100;

  for (let i = 0; i < POLL_COUNT; i++) {
    const template = pollTemplates[i % pollTemplates.length];
    const suffix =
      i >= pollTemplates.length
        ? ` (round ${Math.floor(i / pollTemplates.length) + 1})`
        : "";
    const question = template.question + suffix;

    const maxDuration = pick(durations);
    const maxAge = 10 * DAY * 1000;
    const createdAt = new Date(now - Math.floor(rand() * maxAge));

    const poll = await prisma.poll.create({
      data: {
        question,
        maxDuration,
        createdAt,
        answers: {
          create: template.answers.map((answer) => ({ answer })),
        },
      },
      include: { answers: true },
    });

    const voteCount = randInt(3, 40);
    for (let v = 0; v < voteCount; v++) {
      const answer = pick(poll.answers);
      await prisma.vote.create({
        data: {
          pollId: poll.id,
          selectedAnswerId: answer.id,
        },
      });
    }

    if ((i + 1) % 25 === 0) {
      console.log(`  Seeded ${i + 1}/${POLL_COUNT} polls...`);
    }
  }

  console.log(`Seeded ${POLL_COUNT} polls with votes`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
