import type { Metadata } from "next";
import { NewPollButton } from "@/components/new-poll-button";
import { Providers } from "@/components/providers";
import { Separator } from "@/components/ui/separator";
import "./globals.css";

export const metadata: Metadata = {
  title: "Live Poll coding challenge",
  description: "Create and share live polls",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <header>
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
            <h1 className="text-lg font-semibold tracking-tight">
              Live Poll coding challenge
            </h1>
            <NewPollButton />
          </div>
        </header>
        <Separator />
        <Providers>
          <div className="w-full p-4">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
