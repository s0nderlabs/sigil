import { SiweMessage } from "siwe";

export function verifyApiKey(req: Request): boolean {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${process.env.SIGIL_API_KEY}`;
}

export async function verifySiwe(req: Request): Promise<{ address: string } | null> {
  try {
    const body = await req.clone().json();
    const { message, signature } = body;
    if (!message || !signature) return null;

    const siweMessage = new SiweMessage(message);
    const result = await siweMessage.verify({ signature });
    if (!result.success) return null;

    return { address: siweMessage.address };
  } catch {
    return null;
  }
}
