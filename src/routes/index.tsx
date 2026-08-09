import { createFileRoute } from "@tanstack/react-router";
import Index from "../pages/Index";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Alyxlab · Complete business systems" },
      {
        name: "description",
        content:
          "One system that answers every call, books the job, takes the deposit, and asks for the review. Built and run for local businesses in Dallas.",
      },
      { property: "og:title", content: "Alyxlab · Complete business systems" },
      {
        property: "og:description",
        content:
          "One system that answers every call, books the job, takes the deposit, and asks for the review. Built and run for local businesses in Dallas.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://alyxlab.com/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://alyxlab.com/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ProfessionalService",
          "@id": "https://alyxlab.com/#service",
          name: "Alyxlab",
          url: "https://alyxlab.com/",
          email: "alyxlabwork@gmail.com",
          description:
            "One system that answers every call, books the job, takes the deposit, and asks for the review. Built and run for local businesses in Dallas.",
          areaServed: { "@type": "City", name: "Dallas", containedInPlace: { "@type": "State", name: "Texas" } },
          address: { "@type": "PostalAddress", addressLocality: "Dallas", addressRegion: "TX", addressCountry: "US" },
        }),
      },
    ],
  }),
  component: Index,
});
