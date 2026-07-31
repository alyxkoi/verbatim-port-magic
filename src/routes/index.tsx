import { createFileRoute } from "@tanstack/react-router";
import Index from "../pages/Index";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Alyxlab · Systems that run the business" },
      {
        name: "description",
        content:
          "Not another website. A system that answers, books, and follows up for your business, working the hours you cannot.",
      },
      { property: "og:title", content: "Alyxlab · Systems that run the business" },
      {
        property: "og:description",
        content:
          "Not another website. A system that answers, books, and follows up for your business, working the hours you cannot.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});
