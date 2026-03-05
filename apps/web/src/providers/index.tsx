"use client";

// WagmiProvider + QueryClientProvider wrapper
export function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>; // TODO: wrap with WagmiProvider + QueryClientProvider
}
