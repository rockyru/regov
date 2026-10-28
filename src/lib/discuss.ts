/**
 * Community threads live in GitHub Discussions on the project repo, so RE:GOV stores nothing.
 * Each rebuilt site links to a new thread in the Sites category, with its title and links filled in.
 */
import type { SiteModel } from "@/pipeline/schema";

export const DISCUSSIONS = "https://github.com/rockyru/regov/discussions";

export function discussUrl(site: SiteModel, pub = process.env.PUBLIC_ORIGIN ?? "https://regov.app") {
  const host = new URL(site.origin).host.replace(/^www\./, "");
  const body = `Concept: ${pub}/preview/${site.jobId}\nMigration report: ${pub}/report/${site.jobId}\nOriginal site: ${site.origin}\n\nWhat did the rebuild get wrong, or what should it do better?\n`;
  return `${DISCUSSIONS}/new?${new URLSearchParams({ category: "sites", title: `${host}: ${site.agency.short_name || site.agency.name}`, body })}`;
}

