import type { Photo, Portal, Source } from "./types";

// Every fact below is from Baler's own sites (the sources list at the end), read 28 October 2026.
const S = {
  history: { label: "History · baler.gov.ph", url: "https://baler.gov.ph/history" },
  about: { label: "About Baler · baler.gov.ph", url: "https://baler.gov.ph/about-baler" },
  tourism: { label: "Tourism · baler.gov.ph", url: "https://baler.gov.ph/tourismbaler" },
  travel: { label: "How to get there · baler.gov.ph", url: "https://baler.gov.ph/how-to-get-there-2" },
  fee: { label: "Sustainable Eco-Tourism Development Fee · baler.gov.ph", url: "https://baler.gov.ph/sustainable-eco-tourism-development-fee" },
  map: { label: "Interactive map · baler.gov.ph", url: "https://baler.gov.ph/interactive-map" },
  home: { label: "This is Baler · tourism.baler.gov.ph", url: "https://tourism.baler.gov.ph/" },
  explore: { label: "Explore · tourism.baler.gov.ph", url: "https://tourism.baler.gov.ph/explore/" },
  labasin: { label: "Labasin Cup 2026 · tourism.baler.gov.ph", url: "https://tourism.baler.gov.ph/labasin-cup-2026/" },
  tara: { label: "Baler, ano tara? · tourism.baler.gov.ph", url: "https://tourism.baler.gov.ph/baler-ano-tara/" },
  summer: { label: "Baler Summer Events 2026 · tourism.baler.gov.ph", url: "https://tourism.baler.gov.ph/%f0%9d%97%95%f0%9d%97%94%f0%9d%97%9f%f0%9d%97%98%f0%9d%97%a5-%f0%9d%97%a6%f0%9d%97%a8%f0%9d%97%a0%f0%9d%97%a0%f0%9d%97%98%f0%9d%97%a5-%f0%9d%97%98%f0%9d%97%a9%f0%9d%97%98%f0%9d%97%a1%f0%9d%97%a7/" },
} satisfies Record<string, Source>;

const ph = (name: string, alt: string): Photo => ({ src: `/explore/baler/${name}.jpg`, alt, kind: "placeholder" });
const art = (name: string, alt: string): Photo => ({ src: `/explore/baler/${name}.jpg`, alt, kind: "illustration" });

export const baler: Portal = {
  slug: "baler",
  town: "Baler",
  province: "Aurora",
  region: "Central Luzon",
  islandGroup: "Luzon",
  title: ["THIS IS", "BALER"],
  promise: "Birthplace of Philippine surfing",
  lede: "Beaches, waterfalls, mountains and old landmarks on the Pacific coast of Aurora, where the country's longest-running surf community began.",
  center: { lat: 15.759181, lon: 121.563134, label: "Municipal Government of Baler", source: S.map },
  hero: ph("bay", "A long dark-sand surf bay under soft grey clouds, with green ridges behind"),
  notes: { since: ["Since 1972", "Philippine surfing"], tagline: ["Tara na", "sa Baler."], taglineSource: S.tara },
  facts: [
    { value: "1951", label: "Capital of Aurora" },
    { value: "13", label: "Barangays" },
    { value: "5–5½ h", label: "By bus from Manila" },
    { value: "₱50", label: "Eco-tourism fee" },
  ],
  palette: { accent: "#F5B62A", ink: "#0B0C0E", canvas: "#F4EFE7" },
  story: {
    kicker: "The story of Baler",
    chapters: [
      {
        year: "Before 1578",
        title: "A town of fishers, hunters and farmers",
        body: [
          "Long before the first missionaries came, Baler was already a prominent community that lived from fishing, hunting and farming.",
          "Stern mountain walls closed it in on the land side and the harbourless Pacific lay to the east, so for part of every year it could barely be reached by land or sea.",
        ],
        photo: ph("islets", "Rocky islets off the Pacific coast with waves breaking white"),
        source: S.history,
      },
      {
        year: "1611",
        title: "The first church",
        body: [
          "Franciscan friar Juan Francisco de San Antonio, in charge of Baler from 1611 to 1616, led the building of its first church. The Franciscans and the Recollects took turns running the parish until 1899.",
        ],
        photo: ph("church", "The stone facade and bell tower of an old Spanish-colonial church"),
        source: S.about,
      },
      {
        year: "1613",
        title: "Balod, the mountain dove",
        body: [
          "Two old Tagalog dictionaries, Tomas Pinpin's of 1613 and Noceda and Sanlucar's Vocabulario de la Lengua Tagala of 1754, trace the name to balod, a large mountain dove.",
          "Other stories point to Vale, an old woman; to balid, a Dumagat word meaning \"to return\"; and to Lakan Balid, a nobleman.",
        ],
        photo: ph("road", "Misty rainforest on the mountains of the Sierra Madre"),
        source: S.about,
      },
      {
        year: "1735",
        title: "Tromba Marina, the wave",
        body: [
          "Around 2:00 am on 27 December 1735, on a clear night with no storm in sight, a tidal wave swept the sleeping town into the sea within an hour.",
          "Survivors from the Angara, Bihasa, Bitong, Carrasco, Lumasac and Poblete families swam to Ermita Hill. The town was rebuilt inland, and the old site was named Kinagunasan, the place that was washed out.",
        ],
        photo: ph("ermita", "A stone viewing deck on a grassy hilltop above a town and a wide curving bay"),
        source: S.history,
      },
      {
        year: "1899",
        title: "The Siege of Baler",
        body: [
          "The Spanish garrison under Lt. Saturnino Martin Cerezo held out in the church until 2 June 1899, when it surrendered to Filipino forces under Col. Simeon Tecson.",
          "The siege inspired Republic Act No. 9187 of 2003, which made 30 June Philippine-Spanish Friendship Day.",
        ],
        photo: ph("museum", "Old maps and sepia photographs in a small heritage museum"),
        source: S.about,
      },
      {
        year: "1951",
        title: "Capital of Aurora",
        body: [
          "Baler became the capital of the sub-province of Aurora on 14 June 1951 under Republic Act No. 648, and stayed the seat of government when Aurora became a province in 1978.",
        ],
        photo: ph("bridge", "A cable footbridge over a river below the mountains"),
        source: S.about,
      },
    ],
  },
  heads: {
    places: { kicker: "On the Pacific coast of Luzon", lines: ["Where Luzon", "meets"], outline: "the Pacific." },
    plan: { kicker: "Getting there", lines: ["Manila to", "the"], outline: "Pacific." },
  },
  picks: ["sabang-beach", "ermita-hill", "dicasalarin-cove"],
  places: [
    { slug: "ermita-hill", name: "Ermita Hill", kind: "heritage", barangay: "Zabali", note: "Where survivors of the 1735 wave swam to safety; the Tromba Marina sculpture stands here.", photo: ph("ermita", "The view from a grassy hilltop over rooftops and palms to the bay"), at: { lat: 15.754473, lon: 121.581327, label: "Ermita Park", source: S.map }, source: S.history },
    { slug: "museo-de-baler", name: "Museo de Baler", kind: "museum", note: "Entrance is included in the eco-tourism fee.", photo: ph("museum", "Display cases and old photographs in a museum"), at: { lat: 15.760092, lon: 121.562079, label: "Museo de Baler and Quezon Park", address: "Quezon Street", source: S.map }, source: S.fee },
    { slug: "dona-aurora-memorial-shrine", name: "Doña Aurora Memorial Shrine", kind: "heritage", note: "A historical marker honouring Aurora Aragon Quezon's humanitarian legacy. Entrance is included in the eco-tourism fee.", source: S.explore },
    { slug: "san-luis-obispo-parish", name: "San Luis Obispo Parish", kind: "church", note: "Baler Catholic Church. Its patronal fiesta is on 19 August.", photo: ph("church", "An old stone church facade"), at: { lat: 15.7589047, lon: 121.5627658, label: "Baler Church (San Luis Obispo Parish)", source: S.map }, source: S.about },
    { slug: "dicasalarin-cove", name: "Dicasalarin Cove", kind: "nature", photo: ph("cove", "A white-sand cove below forested headlands and a lighthouse"), at: { lat: 15.7409994, lon: 121.6304111, label: "Dicasalarin Cove", source: S.map }, source: S.map },
    { slug: "aniao-islets", name: "Aniao Islets", kind: "islets", photo: ph("islets", "Rocky islets with waves breaking around them"), at: { lat: 15.7583885, lon: 121.6320848, label: "Aniao Islet", source: S.map }, source: S.about },
    { slug: "cemento-beach-and-cobra-reef", name: "Cemento Beach and Cobra Reef", kind: "beach", photo: ph("reef", "Clear turquoise water over a shallow reef"), at: { lat: 15.7624773, lon: 121.5971088, label: "Cemento Beach/Cobra Reef", source: S.map }, source: S.about },
    { slug: "zabali-hanging-bridge", name: "Zabali Hanging Bridge", kind: "landmark", barangay: "Zabali", photo: ph("bridge", "A cable footbridge over a wide river"), at: { lat: 15.749948, lon: 121.569815, label: "Baler Hanging Bridge", source: S.map }, source: S.map },
    { slug: "sabang-beach", name: "Sabang Beach", kind: "beach", note: "The waves of the Labasin Cup.", photo: ph("surf", "A surfer riding a wave at sunrise"), at: { lat: 15.760531, lon: 121.5693641, label: "Sabang Beach Break", source: S.map }, source: S.labasin },
    { slug: "quezon-memorial-park", name: "Quezon Memorial Park", kind: "park", at: { lat: 15.760092, lon: 121.562079, label: "Museo de Baler and Quezon Park", address: "Quezon Street", source: S.map }, source: S.about },
    { slug: "diguisit-beach", name: "Diguisit Beach", kind: "beach", source: S.map },
    { slug: "dimadimalangat-and-luksu-lukso-islets", name: "Dimadimalangat and Luksu-lukso Islets", kind: "islets", source: S.about },
    { slug: "aurora-lighthouse", name: "Aurora Lighthouse", kind: "landmark", source: S.map },
    { slug: "baler-skatepark", name: "Baler Skatepark", kind: "park", source: S.map },
    { slug: "santo-en-tierro", name: "Santo en Tierro", kind: "landmark", source: S.about },
    { slug: "lt-commander-james-gilmore-marker", name: "Lt. Commander James Gilmore Marker", kind: "heritage", at: { lat: 15.7588118, lon: 121.5630475, label: "Lt. James Gilmore Marker", address: "Rizal Street", source: S.map }, source: S.about },
  ],
  feature: {
    kicker: "Since 1972",
    title: ["A BOARD", "LEFT BEHIND"],
    body: [
      "In 1972 the American surfer Stephen Scott found the Pacific waves of Baler and left a surfboard behind. It came to Raul Tolentino, Baler's first local surfer, and his passion spread until the town had the largest and longest-running surf community in the country.",
      "Together they founded the Aurora Surf Riders Association. On 6 August 2023, Republic Act No. 11957 declared Baler the Birthplace of Philippine Surfing.",
    ],
    photo: ph("surf", "A surfer riding a clean wave at sunrise"),
    source: S.tourism,
  },
  events: [
    { slug: "labasin-cup", name: "Labasin Cup", place: "sabang-beach", month: 4, dates: "29 April – 2 May", year: 2026, note: "Surfing and skating, \"One Ride, One Community\".", photo: ph("festival", "Surfboards on a bamboo rack and a skate ramp on a beach at dusk, under string lights"), source: S.labasin },
    { slug: "kibutan-sa-baler", name: "Kibutan sa Baler", month: 5, dates: "1–3 May", year: 2026, source: S.summer },
    { slug: "summer-dance-recital", name: "All Star Aurora Summer Dance Recital", month: 5, dates: "2 May", year: 2026, source: S.summer },
    { slug: "aurora-vibes", name: "Aurora Vibes 4.0", month: 5, dates: "23–24 May", year: 2026, source: S.summer },
    { slug: "friendship-day", name: "Philippine-Spanish Friendship Day", place: "san-luis-obispo-parish", month: 6, dates: "30 June, every year", note: "Remembers the Siege of Baler.", photo: ph("church", "The stone facade and bell tower of an old Spanish-colonial church"), source: S.about },
    { slug: "town-fiesta", name: "Town and patronal fiesta", place: "san-luis-obispo-parish", month: 8, dates: "19 August, every year", note: "President Manuel L. Quezon's birth anniversary and the feast of San Luis Obispo de Tolosa.", source: S.about },
  ],
  gettingThere: {
    modes: [
      { mode: "By bus", body: ["One bus company runs direct from Manila every day, leaving between midnight and 7:00 am. The trip takes about 5 to 5½ hours.", "Genesis Transport, 704 EDSA corner New York St., Cubao, Quezon City · +63 2 709-0803. The deluxe Joy bus leaves at 12:00 am and 1:00 am; the published fare is ₱650."], stat: { value: "5–5½ h", label: "Manila to Baler" }, art: art("plan-bus", "An illustrated bus on a mountain road") },
      { mode: "By car", body: ["Take NLEX at Balintawak, then SCTEX to the La Paz toll gate, and on through Aliaga to Cabanatuan City.", "From there two roads lead to Baler: the Canili–Pantabangan Road and the Baler–Bongabon Road."], stat: { value: "2 roads", label: "from Cabanatuan City" }, art: art("plan-car", "An illustrated car on a winding rainforest road") },
      { mode: "By air", body: ["Juan C. Angara Airport, a community airport in Barangay San Isidro, San Luis, is about seven kilometres from Baler. Air Juan began seaplane flights from Manila South Harbor in March 2017; check that they still run."], stat: { value: "7 km", label: "airport to Baler, about" }, art: art("plan-plane", "An illustrated seaplane over a calm sea") },
    ],
    route: ["Manila", "NLEX", "SCTEX", "La Paz exit", "Tarlac City", "Aliaga", "Zaragoza", "Sta. Rosa", "Cabanatuan City", "Palayan City", "Bongabon", "Rizal", "Pantabangan", "Maria Aurora", "San Luis", "Baler"],
    photo: ph("road", "A mountain highway through misty rainforest"),
    art: art("plan-route", "An illustrated journey from a city across rice plains and mountains to a surf bay"),
    source: S.travel,
  },
  fee: {
    title: "Sustainable Eco-Tourism Development Fee",
    amount: "₱50",
    basis: "Municipal Ordinance No. 2025-006",
    notes: ["Paid by every tourist or visitor.", "Senior citizens and persons with disability get 20% off.", "Covers entrance to Museo de Baler and the Doña Aurora shrine."],
    exempt: [
      { who: "Children 7 and under", detail: "" },
      { who: "Residents of Aurora", detail: "With a valid government ID" },
      { who: "Visiting government officials", detail: "On official business" },
      { who: "Researchers", detail: "With prior consent of LGU Baler" },
    ],
    uses: [
      { share: 80, label: "Development", detail: "Coastal, urban and upland resource management, heritage, tourism, marketing" },
      { share: 20, label: "Administration", detail: "Tickets, collectors, supplies, the fee booth" },
    ],
    source: S.fee,
  },
  stay: {
    categories: ["Accommodation", "Restaurants", "Souvenirs", "Recreation", "Travel and tours"],
    products: "Coconut, rice, fish, citrus, processed food, sabutan, and wood and non-wood forest products.",
    map: S.map,
    source: S.tourism,
  },
  office: { name: "Tourism Office Baler", phone: "0928-569-7963", address: "Executive Bldg., Municipal Plaza, Baler, Aurora 3200" },
  hotlines: [
    { name: "MDRRMO", numbers: "0920-594-1806" },
    { name: "Baler PNP", numbers: "0908-526-4029 · 0998-598-5340" },
    { name: "Baler BFP", numbers: "0917-119-2784 · 0939-216-6377" },
    { name: "RHU Baler", numbers: "0930-668-3981 · 0927-304-2828" },
    { name: "Philippine Coast Guard", numbers: "0998-585-6227" },
    { name: "PDRRMO", numbers: "0939-325-7838 · 0963-742-7777" },
    { name: "Philippine Army", numbers: "0945-457-7339" },
    { name: "AURELCO", numbers: "0999-977-2735 · 0921-866-1859" },
  ],
  sources: Object.values(S),
};
