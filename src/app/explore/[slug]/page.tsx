import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMaps, getPortal, portalSlugs } from "@/lib/explore";
import { project } from "@/lib/explore/geo";
import { Hero } from "@/components/explore/Hero";
import { Story } from "@/components/explore/Story";
import { SiteNav } from "@/components/explore/SiteNav";
import { Places, PlacesWhere } from "@/components/explore/Places";
import { Events } from "@/components/explore/Events";
import { Plan } from "@/components/explore/Plan";
import { Footer } from "@/components/explore/Footer";
import "../explore.css";

export const dynamicParams = false;
export const generateStaticParams = () => portalSlugs().map((slug) => ({ slug }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const portal = getPortal((await params).slug);
  if (!portal) return {};
  return {
    title: `Explore ${portal.town}`,
    description: `${portal.promise}. An unofficial RE:GOV Explore concept of ${portal.town}, ${portal.province}, built from the LGU's own pages.`,
    robots: { index: false, follow: false },
  };
}

export default async function ExplorePage({ params }: { params: Promise<{ slug: string }> }) {
  const portal = getPortal((await params).slug);
  const maps = getMaps((await params).slug);
  if (!portal || !maps) notFound();
  const [x, y] = project(maps.country, portal.center.lat, portal.center.lon);
  return (
    <div className="xp" id="top">
      <SiteNav />
      <Hero portal={portal} />
      <Story kicker={portal.story.kicker} chapters={portal.story.chapters}
        map={{ w: maps.country.w, h: maps.country.h, land: maps.country.land, x, y, town: portal.town, sub: `${portal.province}, ${portal.islandGroup}` }}>
        <PlacesWhere portal={portal} maps={maps} />
      </Story>
      <Places portal={portal} maps={maps} />
      <Events portal={portal} />
      <Plan portal={portal} />
      <Footer portal={portal} />
    </div>
  );
}
