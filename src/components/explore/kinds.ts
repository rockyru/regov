import type { Place } from "@/lib/explore/types";

export const KIND: Record<Place["kind"], string> = {
  beach: "Beach", islets: "Islets", heritage: "Heritage", church: "Church", museum: "Museum", nature: "Nature", landmark: "Landmark", park: "Park",
};

export const num = (i: number) => String(i + 1).padStart(2, "0");

export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
