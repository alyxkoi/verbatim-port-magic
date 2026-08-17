import { createFileRoute } from "@tanstack/react-router";

// Temporary one-time bootstrap endpoint. Delete after the operator exists.
export const Route = createFileRoute("/api/bootstrap-operator")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { bootstrapOperator } = await import("@/lib/bootstrap-operator.functions");
        const body = (await request.json()) as { email: string; password: string };
        const result = await bootstrapOperator({ data: body });
        return Response.json(result);
      },
    },
  },
});
