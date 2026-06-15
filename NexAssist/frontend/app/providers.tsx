"use client";

import type { ReactNode } from "react";
import { Toaster } from "sonner";

export function Providers({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <>
      {children}
      <Toaster richColors closeButton />
    </>
  );
}
