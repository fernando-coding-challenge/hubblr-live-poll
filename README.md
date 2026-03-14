# Poll App coding challenge

A real-time poll application built with Next.js, where users can create polls, vote, and see live results.

## Tech Stack

- **Framework:** Next.js 16 (React 19)
- **Language:** TypeScript
- **Database:** SQLite via Prisma + better-sqlite3
- **Styling/UI library:** Tailwind and shadcn components
- **Validation:** Zod + React Hook Form
- **Testing:** Vitest

## Prerequisites

- [Node.js](https://nodejs.org/) v20 or later
- npm

## How to run it locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create the environment file:
   ```bash
   cp .env.example .env
   ```
3. Generate the Prisma client and create the database:
   ```bash
   npx prisma generate
   npx prisma db push
   ```
4. (Optional) Seed the database with sample data:
   ```bash
   npx tsx prisma/seed.ts
   ```
   **Warning:** this deletes all existing data before seeding.
5. Start the dev server:
   ```bash
   npm run dev
   ```

The app will be available at [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── polls/          # API routes (create, get, vote, list)
│   ├── poll/[uuid]/        # Poll detail page
│   ├── page.tsx            # Home page (create poll + browse)
│   ├── layout.tsx          # Root layout
│   └── globals.css         # Global styles
├── components/             # Shared UI components
├── generated/prisma/       # Generated Prisma client (git-ignored)
└── lib/                    # Utilities, schemas, Prisma client
prisma/
├── schema.prisma           # Database schema
└── seed.ts                 # Database seed script, for internal tests
```

## Room for improvement

- A few integration tests (create, view and vote flows).
- Better security to not spam reload for vote spamming
- CI/CD for running tests/lint checks in pipelines, deploy envs, etc

And a lot more
