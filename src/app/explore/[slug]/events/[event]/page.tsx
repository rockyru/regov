import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPortal, portalSlugs } from "@/lib/explore";
import { SiteNav } from "@/components/explore/SiteNav";
import { EventView } from "@/components/explore/EventView";
import "../../../explore.css";

export const dynamicParams = false;
export const generateStaticParams = () => portalSlugs().flatMap((slug) => getPortal(slug)!.events.map((e) => ({ slug, event: e.slug })));

type Params = Promise<{ slug: string; event: string }>;
const find = async (params: Params) => {
  const { slug, event } = await params;
  const portal = getPortal(slug);
  return { portal, event: portal?.events.find((e) => e.slug === event) };
};

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { portal, event } = await find(params);
  if (!portal || !event) return {};
  return {
    title: `${event.name} · Explore ${portal.town}`,
    description: `${event.name}, ${event.dates}, ${portal.town}, ${portal.province}. An unofficial RE:GOV Explore concept built from the LGU's own pages.`,
    robots: { index: false, follow: false },
  };
}

export default async function EventPage({ params }: { params: Params }) {
  const { portal, event } = await find(params);
  if (!portal || !event) notFound();
  return (
    <div className="xp" id="top">
      <SiteNav base={`/explore/${portal.slug}`} current="events" />
      <EventView portal={portal} event={event} />
    </div>
  );
}
