import { Container } from "@cloudflare/containers";

interface Env {
  REGOV: DurableObjectNamespace<RegovContainer>;
  MODEL_API_KEY: string;
  R2_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_BUCKET: string;
}

/** One always-warm instance runs the Next.js app and the pipeline. Jobs sync to R2. */
export class RegovContainer extends Container<Env> {
  defaultPort = 3000;
  sleepAfter = "6h";
  envVars = {
    MODEL_API_KEY: this.env.MODEL_API_KEY,
    MODEL_API_BASE: "https://api.meta.ai/v1",
    MUSE_MODEL: "muse-spark-1.3",
    R2_ACCOUNT_ID: this.env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: this.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: this.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET: this.env.R2_BUCKET ?? "regov-jobs",
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return env.REGOV.getByName("main").fetch(request);
  },
} satisfies ExportedHandler<Env>;
