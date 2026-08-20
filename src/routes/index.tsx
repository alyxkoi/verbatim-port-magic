import { createFileRoute } from "@tanstack/react-router";
import siteHtml from "@/site/index.html?raw";

/* The marketing site is a finished static build served byte for byte.
   Head tags, CSS and JS all live inside src/site/index.html. */
export const Route = createFileRoute("/")({
  server: {
    handlers: {
      GET: async () =>
        new Response(siteHtml, {
          headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "public, max-age=0, must-revalidate",
          },
        }),
    },
  },
});
