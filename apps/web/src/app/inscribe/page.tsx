"use client";

import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ChatInterface } from "@/components/chat/chat-interface";
import { useChat } from "@/hooks/use-chat";
import { useSiweAuth } from "@/hooks/use-siwe";
import type { SiweAuth } from "@/hooks/use-siwe";

const IS_DEV = process.env.NODE_ENV === "development";
const DEV_AUTH: SiweAuth = { message: "dev", signature: "dev" };

export default function InscribePage() {
  const { address, isConnected } = useAccount();
  const { siweAuth, isAuthenticating, authError } = useSiweAuth({ enabled: !IS_DEV });
  const { messages, isLoading, error, sendMessage, reset } = useChat();

  // Resolve auth — skip SIWE in dev mode
  const auth = IS_DEV ? DEV_AUTH : siweAuth;
  const authenticating = IS_DEV ? false : isAuthenticating;
  const authErr = IS_DEV ? null : authError;

  // Not connected — show connect screen
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] text-center px-6">
        <h1 className="font-serif text-3xl text-ink mb-3">
          Connect Your Wallet
        </h1>
        <p className="text-sm text-ink-light max-w-md mb-8">
          Connect a wallet to start defining compliance policies for your protocol's ERC-8004 agents.
        </p>
        <ConnectButton />
      </div>
    );
  }

  // Authenticating — SIWE in progress
  if (authenticating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] text-center px-6">
        <div className="w-5 h-5 border-2 border-teal border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-serif text-lg text-ink mb-1">Verifying identity</p>
        <p className="text-sm text-ink-light">
          Please sign the message in your wallet.
        </p>
      </div>
    );
  }

  // Auth error
  if (authErr) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] text-center px-6">
        <p className="font-serif text-lg text-ink mb-2">Authentication Failed</p>
        <p className="text-sm text-fail mb-6">{authErr}</p>
        <ConnectButton />
      </div>
    );
  }

  // Authenticated — show chat
  if (!auth) return null;

  return (
    <ChatInterface
      messages={messages}
      isLoading={isLoading}
      error={error}
      onSend={(text) => sendMessage(text, address!, auth)}
      onReset={reset}
    />
  );
}
