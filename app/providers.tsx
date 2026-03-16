"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster
        position="bottom-right"
        theme="dark"
        toastOptions={{
          style: {
            background: "#141414",
            border: "1px solid #1f1f1f",
            color: "#f5f5f5",
          },
        }}
      />
    </SessionProvider>
  );
}
