import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMaps, getPortal, portalSlugs } from "@/lib/explore";
import { SiteNav } from "@/components/explore/SiteNav";
import { PlaceView } from "@/components/explore/PlaceView";
import "../../../explore.css";

export const dynamicParams = false;
export const generateStaticParams = () => portalSlugs().flatMap((slug) => getPortal(slug)!.places.map((p) => ({ slug, place: p.slug })));

type Params = Promise<{ slug: string; place: string }>;
const find = async (params: Params) => {
  const { slug, place } = await params;
  const portal = getPortal(slug);
  return { portal, place: portal?.places.find((p) => p.slug === place), maps: getMaps(slug) };
};

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { portal, place } = await find(params);
  if (!portal || !place) return {};
  return {
    title: `${place.name} · Explore ${portal.town}`,
    description: `${place.name}, ${portal.town}, ${portal.province}. An unofficial RE:GOV Explore concept built from the LGU's own pages.`,
    robots: { index: false, follow: false },
  };
}

export default async function PlacePage({ params }: { params: Params }) {
  const { portal, place, maps } = await find(params);
  if (!portal || !place || !maps) notFound();
  return (
    <div className="xp" id="top">
      <SiteNav base={`/explore/${portal.slug}`} current="places" />
      <PlaceView portal={portal} place={place} maps={maps} />
    </div>
  );
}
