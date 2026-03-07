"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAccount, useSignMessage, useDisconnect } from "wagmi";
import { SiweMessage } from "siwe";

export interface SiweAuth {
  message: string;
  signature: string;
}

export function useSiweAuth({ enabled = true }: { enabled?: boolean } = {}) {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();

  const [siweAuth, setSiweAuth] = useState<SiweAuth | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const signingRef = useRef(false);

  useEffect(() => {
    if (!enabled || !isConnected || !address || siweAuth || signingRef.current) return;

    signingRef.current = true;
    setIsAuthenticating(true);
    setAuthError(null);

    (async () => {
      try {
        const siweMessage = new SiweMessage({
          domain: window.location.host,
          address,
          statement: "Sign in to Sigil to create compliance policies.",
          uri: window.location.origin,
          version: "1",
          chainId: 11155111,
          nonce: crypto.randomUUID().replace(/-/g, "").slice(0, 16),
          issuedAt: new Date().toISOString(),
        });

        const message = siweMessage.prepareMessage();
        const signature = await signMessageAsync({ message });

        setSiweAuth({ message, signature });
        setIsAuthenticating(false);
      } catch {
        setAuthError("Signature rejected. Please reconnect to try again.");
        setIsAuthenticating(false);
        disconnect();
      } finally {
        signingRef.current = false;
      }
    })();
  }, [isConnected, address, siweAuth, signMessageAsync, disconnect]);

  // Reset on disconnect
  useEffect(() => {
    if (!isConnected) {
      setSiweAuth(null);
      setAuthError(null);
      signingRef.current = false;
    }
  }, [isConnected]);

  const resetAuth = useCallback(() => {
    setSiweAuth(null);
    setAuthError(null);
    signingRef.current = false;
  }, []);

  return { siweAuth, isAuthenticating, authError, resetAuth };
}
