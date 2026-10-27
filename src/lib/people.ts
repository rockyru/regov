/** Matching people across pages and photos: "Hon. Alfredo B. Castro Jr." and "ALFREDO B. CASTRO JR" are one person. */
export const personKey = (name: string) => name.toLowerCase().normalize("NFKD").replace(/\b(hon|honorable|atty|dr|engr|arch|mr|mrs|ms|prof|rev|fr|sr|gen|col|capt|kgg|kagawad)\b\.?/g, "").replace(/[^a-z]+/g, " ").trim().replace(/\s+/g, " ");

export type PortraitMap = Record<string, { src: string; alt: string }>;
export const portraitOf = (map: PortraitMap | undefined, name: string) => map?.[personKey(name)];
