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
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});
