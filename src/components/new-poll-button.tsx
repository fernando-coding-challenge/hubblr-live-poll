"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

export function NewPollButton() {
  const pathname = usePathname();

  if (pathname === "/") return null;

  return (
    <Button nativeButton={false} render={<Link href="/" />}>
      New poll
    </Button>
  );
}
