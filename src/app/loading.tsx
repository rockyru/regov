import { LogoLoader } from "@/components/LogoLoader";

/** Shown while any page renders on the server (every route is dynamic). */
export default function Loading() {
  return <LogoLoader />;
}
