import { resolve } from "path";

export function handleHealth(_req: Request): Response {
  return Response.json({ status: "ok" });
}

export async function handleCreHealth(_req: Request): Promise<Response> {
  const creBin = process.env.CRE_BIN || resolve(process.env.HOME || "~", ".cre/bin/cre");

  const proc = Bun.spawn([creBin, "whoami"], {
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  if (exitCode !== 0) {
    return Response.json({
      status: "error",
      message: "CRE auth failed",
      detail: stderr.trim() || stdout.trim(),
    }, { status: 503 });
  }

  const emailMatch = stdout.match(/Email:\s+(\S+)/);
  const email = emailMatch?.[1] ?? "unknown";
  const [user, domain] = email.split("@");
  const masked = user.length <= 2
    ? user[0] + "***"
    : user[0] + "***" + user[user.length - 1];

  return Response.json({
    status: "ok",
    email: domain ? `${masked}@${domain}` : email,
  });
}
