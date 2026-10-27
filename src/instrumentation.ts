// Runs once when the Next.js server starts. Importing the run queue here constructs it at boot,
// which closes out runs on disk that a previous process left half-finished (container restart).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") await import("@/lib/runQueue");
}
