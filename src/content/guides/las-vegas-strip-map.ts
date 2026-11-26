import type { Guide } from "./types";

export const guide: Guide = {
  slug: "las-vegas-strip-map",
  cluster: "Casino knowledge",
  keyword: "las vegas strip map",
  secondary: ["las vegas boulevard", "strip versus downtown", "walking the strip"],
  title: "Las Vegas Strip Map: Resorts, Downtown and Transit",
  description:
    "Find official Las Vegas Strip and downtown maps, compare walking and transit routes, and check crossings and event restrictions before your visit.",
  h1: "Las Vegas Strip map: finding resorts and planning the route",
  answer:
    "A Las Vegas Strip map should distinguish the resort corridor along Las Vegas Boulevard from downtown's Fremont Street area. The Las Vegas Convention and Visitors Authority supplies maps of both areas and links to bus, monorail and other transport information. Use those primary maps for navigation, then check current route and access notices before travelling.",
  facts: [
    "The Strip and downtown are separate areas.",
    "A resort's map marker may be far from the pedestrian entrance or transit stop.",
    "Crossings, heat and temporary event restrictions affect a walking plan.",
  ],
  sections: [
    {
      id: "section-1",
      title: "Open an official map",
      body: `The LVCVA maps page provides downloadable Strip and downtown maps. It also links airport, convention-center, monorail and RTC bus information. Choose the map that matches the journey instead of treating a resort advertising diagram as a complete city map.`,
    },
    {
      id: "section-2",
      title: "Choose a practical route",
      body: `Locate the exact entrance, pedestrian crossing and transit stop at both ends. Distances between property boundaries understate the walk from one lobby to another. Check accessibility arrangements if stairs, bridges or long indoor routes are a concern.

The [downtown casino guide](/guides/downtown-las-vegas-casinos) covers Fremont Street, while [Fontainebleau Las Vegas](/guides/fontainebleau-las-vegas-casino) is a north Strip example.`,
    },
    {
      id: "section-3",
      title: "Check the day's travel conditions",
      body: `Read the transport operator's current service information and the venue's event notices. A saved map can remain geographically useful while a stop, driveway or crossing is temporarily inaccessible. Carry water and allow extra time in hot weather.

A map helps plan travel; compare game rules and costs separately using [casino etiquette](/guides/casino-etiquette) and [casino chip values](/guides/casino-chip-values).`,
    },
  ],
  faqs: [
    {
      q: "Is Fremont Street part of the Strip?",
      a: "No. Fremont Street is downtown, a separate area from the Strip resort corridor.",
    },
    {
      q: "Where can I get an official map?",
      a: "The LVCVA maps and transport page supplies downloadable Strip and downtown maps and links to transit information.",
    },
    {
      q: "Can I infer walking time from the hotel markers?",
      a: "Only roughly. Entrances, crossings, indoor routes, heat and access restrictions can add distance and time.",
    },
    {
      q: "Does the map show current fares and closures?",
      a: "Use current operator notices for fares and disruptions. A downloaded map can predate those changes.",
    },
  ],
  sources: [
    {
      label: "Las Vegas Convention and Visitors Authority: maps and transport",
      url: "https://www.visitlasvegas.com/plan/getting-here-and-around/maps/",
    },
    {
      label: "Wikipedia: Las Vegas Strip",
      url: "https://en.wikipedia.org/wiki/Las_Vegas_Strip",
    },
  ],
  related: [
    "las-vegas-history",
    "house-edge",
    "riviera-casino",
    "biggest-casino-in-the-world",
    "fontainebleau-las-vegas-casino",
    "online-gambling-legal-nevada",
    "benny-binion",
  ],
  updated: "2026-11-26",
};
