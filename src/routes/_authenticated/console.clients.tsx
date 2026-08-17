import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";

import { ClientDrawer } from "@/components/console/ClientDrawer";
import { EmptyState } from "@/components/console/EmptyState";
import { STRIPE_LABELS } from "@/lib/allowance";
import { disconnectStripe, listClients, startStripeConnect } from "@/lib/clients.functions";

export const Route = createFileRoute("/_authenticated/console/clients")({
  component: ClientsScreen,
});

const STRIPE_RETURN: Record<string, string> = {
  connected: "Stripe connected. Their payments will reconcile from here.",
  denied: "The client cancelled the Stripe connection.",
  expired: "That Stripe link expired. Send a new one.",
  invalid: "That Stripe link was not valid.",
  error: "Stripe could not finish the connection.",
};

function ClientsScreen() {
  const fetchClients = useServerFn(listClients);
  const connectFn = useServerFn(startStripeConnect);
  const disconnectFn = useServerFn(disconnectStripe);
  const queryClient = useQueryClient();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ["clients"], queryFn: () => fetchClients() });

  // The OAuth callback returns through the browser, so the outcome arrives here.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const outcome = params.get("stripe");
    if (!outcome) return;
    setNotice(STRIPE_RETURN[outcome] ?? null);
    window.history.replaceState({}, "", window.location.pathname);
    void queryClient.invalidateQueries({ queryKey: ["clients"] });
  }, [queryClient]);

  const connect = useMutation({
    mutationFn: (clientId: string) => connectFn({ data: { clientId, origin: window.location.origin } }),
    onSuccess: (result) => {
      window.location.href = result.url;
    },
    onError: (error: Error) => setNotice(error.message),
  });

  const disconnect = useMutation({
    mutationFn: (clientId: string) => disconnectFn({ data: { clientId } }),
    onSuccess: () => {
      setNotice("Stripe disconnected.");
      void queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (error: Error) => setNotice(error.message),
  });

  const clients = data?.clients ?? [];
  const active = useMemo(() => clients.find((client) => client.id === activeId) ?? null, [clients, activeId]);

  if (isLoading) {
    return (
      <section className="screen" aria-label="Clients">
        <article className="surface">
          <EmptyState title="Loading the roster" text="One moment." />
        </article>
      </section>
    );
  }

  if (!clients.length) {
    return (
      <section className="screen" aria-label="Clients">
        <article className="surface">
          <EmptyState title="No clients running yet" text="Clients appear here once a plan is accepted and live." />
        </article>
      </section>
    );
  }

  return (
    <section className="screen" aria-label="Clients">
      <div className="screen-stack">
        {notice ? (
          <article className="surface">
            <p className="pillar-note">{notice}</p>
          </article>
        ) : null}

        <article className="roster-banner">
          <div className="roster-lead">
            <span className="roster-kicker">Client roster</span>
            <h2>
              <em className="tabular">{clients.length}</em> of {data?.seatTarget}
            </h2>
          </div>
          <div className="roster-figures">
            <div>
              <span>Recurring</span>
              <strong className="tabular">${(data?.mrr ?? 0).toLocaleString()}</strong>
            </div>
            <div>
              <span>Needs you</span>
              <strong className={`tabular ${data?.attention ? "is-attention" : ""}`}>{data?.attention ?? 0}</strong>
            </div>
            <div>
              <span>Overage</span>
              <strong className="tabular">${(data?.overage ?? 0).toFixed(2)}</strong>
            </div>
          </div>
        </article>

        <div className="section-heading">
          <h2>Every account</h2>
          <span>{clients.length} running</span>
        </div>

        <div className="client-grid">
          {clients.map((client) => {
            const [stripeLabel, stripeTone] = STRIPE_LABELS[client.stripe] ?? STRIPE_LABELS["not_connected"]!;
            const term =
              client.term === "annual" ? `Annual, renews ${client.endsAt ?? "—"}` : "Month to month";
            return (
              <article
                key={client.id}
                className="surface client-card is-interactive"
                data-tone={client.tone}
                role="button"
                tabIndex={0}
                aria-label={`Open ${client.name}`}
                onClick={() => setActiveId(client.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setActiveId(client.id);
                  }
                }}
              >
                <header className="client-head">
                  <div className="client-id">
                    <h3>{client.name}</h3>
                    <p>{client.contact}</p>
                  </div>
                  <span className={`tier-tag tier-${client.tier}`}>{client.tierLabel}</span>
                </header>
                <div className="client-figures">
                  <div>
                    <span>Monthly</span>
                    <strong className="tabular">${client.monthly}</strong>
                  </div>
                  <div>
                    <span>Leads</span>
                    <strong className="tabular">{client.leadsMonth}</strong>
                  </div>
                  <div>
                    <span>Texts</span>
                    <strong className="tabular">{(client.segments / 1000).toFixed(1)}k</strong>
                  </div>
                </div>
                <div className="client-usage">
                  <div className="client-usage-head">
                    <span className="usage-pct" data-tone={client.tone}>
                      <em>{client.pct}%</em> of {client.allowance / 1000}k texts
                    </span>
                    {client.overage > 0 ? (
                      <em className="tabular" data-tone="danger">
                        +${client.overage.toFixed(2)}
                      </em>
                    ) : null}
                  </div>
                  <div className="meter">
                    <span
                      className="meter-fill"
                      data-tone={client.tone}
                      style={{ width: `${Math.min(100, client.pct)}%` }}
                    />
                  </div>
                </div>
                <footer className="client-foot">
                  {/* The chip is only a button when it needs action. */}
                  {client.stripe === "connected" ? (
                    <span className={`wire wire-${stripeTone}`}>
                      <i />
                      {stripeLabel}
                    </span>
                  ) : (
                    <button
                      className={`wire wire-${stripeTone} is-action`}
                      type="button"
                      disabled={connect.isPending}
                      onClick={(event) => {
                        event.stopPropagation();
                        connect.mutate(client.id);
                      }}
                    >
                      <i />
                      {client.stripe === "not_connected" ? "Connect Stripe" : "Reconnect Stripe"}
                    </button>
                  )}
                  <span className="client-term">{term}</span>
                </footer>
              </article>
            );
          })}
        </div>
      </div>

      {active ? (
        <ClientDrawer
          client={active}
          busy={connect.isPending || disconnect.isPending}
          onClose={() => setActiveId(null)}
          onConnect={() => connect.mutate(active.id)}
          onDisconnect={() => disconnect.mutate(active.id)}
        />
      ) : null}
    </section>
  );
}
