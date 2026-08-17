import { useEffect, useRef } from "react";

import { Icon } from "@/components/console/icons";
import { STRIPE_LABELS, TIER_FEATURES, TIER_LIMITS, TIER_RANK } from "@/lib/allowance";
import type { ClientRow } from "@/lib/clients.functions";

export function ClientDrawer({
  client,
  onClose,
  onConnect,
  onDisconnect,
  busy,
}: {
  client: ClientRow;
  onClose: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
  busy: boolean;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [stripeLabel, stripeTone] = STRIPE_LABELS[client.stripe] ?? STRIPE_LABELS["not_connected"]!;
  const rank = TIER_RANK[client.tier];
  const liveFeatures = TIER_FEATURES.filter((feature) => TIER_RANK[feature[1]] <= rank).length;

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="panel-layer is-open"
      aria-hidden="false"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="detail-panel client-panel" role="dialog" aria-modal="true" aria-labelledby="clientPanelTitle">
        <header className="panel-header">
          <div>
            <h2 id="clientPanelTitle">{client.name}</h2>
            <p>
              <span>{client.contact}</span>
              <span className={`tier-tag tier-${client.tier}`}>{client.tierLabel}</span>
            </p>
            <div className="contact-actions">
              <span className="contact-link">
                <Icon name="card" /> ${client.monthly} a month
              </span>
              <span className="contact-link">
                <Icon name="calendar" /> Client since {client.startedAt}
              </span>
            </div>
          </div>
          <button
            ref={closeRef}
            className="icon-button"
            type="button"
            onClick={onClose}
            aria-label="Close client detail"
          >
            <Icon name="close" />
          </button>
        </header>

        <div className="panel-scroll">
          <section className="acct-block">
            <header className="acct-head">
              <h3>
                <Icon name="stripe" /> Stripe
              </h3>
              <span className={`wire wire-${stripeTone}`}>
                <i />
                {stripeLabel}
              </span>
            </header>
            {client.stripe === "connected" ? (
              <>
                <div className="acct-detail">
                  <div>
                    <span>Business</span>
                    <strong>{client.stripeName ?? "—"}</strong>
                  </div>
                  <div>
                    <span>Account</span>
                    <strong className="tabular">acct_••••{client.stripeLast4 ?? "----"}</strong>
                  </div>
                </div>
                <button className="button ghost" type="button" onClick={onDisconnect} disabled={busy}>
                  Disconnect
                </button>
              </>
            ) : (
              <button className="button primary-pulse" type="button" onClick={onConnect} disabled={busy}>
                <Icon name="stripe" /> Connect Stripe
              </button>
            )}
            {/* Read only access. Their customers pay them directly. */}
            <p className="pillar-note">
              Read only access to their own account. Their customers pay them directly and Alyx Lab never touches
              that money.
            </p>
          </section>

          <section className="acct-block">
            <header className="acct-head">
              <h3>
                <Icon name="calendar" /> Term
              </h3>
              <span className="wire wire-muted">
                <i />
                {client.term === "annual" ? "Annual" : "Month to month"}
              </span>
            </header>
            {/* Read only. Term changes are a billing decision, not a console one. */}
            <div className="acct-detail">
              <div>
                <span>Started</span>
                <strong>{client.startedAt}</strong>
              </div>
              <div>
                <span>Tier</span>
                <strong>{client.tierLabel}</strong>
              </div>
              <div>
                <span>Monthly</span>
                <strong className="tabular">${client.monthly}</strong>
              </div>
              <div>
                <span>Setup paid</span>
                <strong className="tabular">${client.setupPaid}</strong>
              </div>
              {client.term === "annual" ? (
                <div>
                  <span>Goes monthly</span>
                  <strong>{client.endsAt ?? "—"}</strong>
                </div>
              ) : null}
            </div>
          </section>

          <section className="acct-block">
            <header className="acct-head">
              <h3>
                <Icon name="message" /> Texts this month
              </h3>
              <span className={`wire wire-${client.tone === "ok" ? "ok" : "attention"}`}>
                <i />
                {client.pct}% of {client.allowance / 1000}k
              </span>
            </header>
            <div className="meter">
              <span
                className="meter-fill"
                data-tone={client.tone}
                style={{ width: `${Math.min(100, client.pct)}%` }}
              />
            </div>
            <div className="acct-detail">
              <div>
                <span>Number</span>
                <strong>{client.number}</strong>
              </div>
              <div>
                <span>Used</span>
                <strong className="tabular">{client.segments.toLocaleString()}</strong>
              </div>
              <div>
                <span>Included</span>
                <strong className="tabular">{client.allowance.toLocaleString()}</strong>
              </div>
              <div>
                <span>Overage</span>
                <strong className={`tabular ${client.overage > 0 ? "is-attention" : ""}`}>
                  {client.overage > 0 ? `$${client.overage.toFixed(2)}` : "None"}
                </strong>
              </div>
            </div>
            {client.overage > 0 ? (
              /* Recorded so the cost is visible. Never billed to the client. */
              <p className="pillar-note">Absorbed, not charged. The cap never stops a live conversation.</p>
            ) : null}
          </section>

          <section className="acct-block">
            <header className="acct-head">
              <h3>
                <Icon name="check" /> What is running
              </h3>
              <span className="wire wire-muted">
                <i />
                {liveFeatures} of {TIER_FEATURES.length}
              </span>
            </header>
            <div className="feature-grid">
              {TIER_FEATURES.map(([name, tier]) => {
                const on = TIER_RANK[tier] <= rank;
                return (
                  <div key={name} className={`feature-row ${on ? "is-on" : ""}`}>
                    <Icon name={on ? "check" : "lock"} />
                    <span>{name}</span>
                    {on ? null : <em>{TIER_LIMITS[tier].label}</em>}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
