// Lead drawer. Markup ported from openLead()/renderConversationSection()/
// renderPillarSection()/renderLeadFooter() in alyxlab-console.html.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";

import { Icon } from "@/components/console/icons";
import { approveDraft, generateDraft } from "@/lib/blip.functions";
import {
  cancelQueuedMessage,
  getLead,
  markLeadJunk,
  restoreLead,
  savePillars,
  sendManualMessage,
  setLeadStatus,
  setTakeover,
} from "@/lib/leads.functions";
import {
  LEAD_MANUAL_STATUS_OPTIONS,
  STATUS_MAP,
  completedPillarCount,
  isMissingPillar,
  pillarText,
  relativeTime,
  type DisplayStatus,
  type PillarSpec,
} from "@/lib/lead-status";

function workflowCopy(lead: {
  displayStatus: DisplayStatus;
  flags: string[];
  takenOver: boolean;
  hasPlan: boolean;
}): [string, string] {
  if (lead.flags.length && lead.displayStatus !== "closed")
    return [
      "Review before texting",
      "Alyx has not contacted this lead. Confirm the flags before anything sends.",
    ];
  if (lead.displayStatus === "drafted")
    return [
      "Plan ready for review",
      "The draft is complete and waiting for your words and approval.",
    ];
  if (lead.displayStatus === "won")
    return ["Active client", "Payment is matched and this client remains available in the workspace."];
  if (lead.displayStatus === "closed")
    return ["Messaging stopped", "No follow-up will send unless you restore this lead."];
  if (lead.takenOver)
    return [
      "You are replying",
      "Automation is paused for this conversation until you hand it back to Alyx.",
    ];
  if (lead.displayStatus === "talking")
    return [
      "Conversation in progress",
      "Alyx is collecting the remaining quote details and watching for questions.",
    ];
  return [
    "Ready for the next reply",
    "Recent activity and the information still needed are kept together here.",
  ];
}

export function LeadDrawer({
  leadId,
  pillarSpecs,
  onClose,
}: {
  leadId: string;
  pillarSpecs: PillarSpec[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const fetchLead = useServerFn(getLead);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [editingPillars, setEditingPillars] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [pillarErrors, setPillarErrors] = useState<Record<string, string>>({});
  const [saveState, setSaveState] = useState("");
  const [compose, setCompose] = useState("");
  const [blipEdit, setBlipEdit] = useState<string | null>(null);

  const { data: lead } = useQuery({
    queryKey: ["console", "lead", leadId],
    queryFn: () => fetchLead({ data: { leadId } }),
  });

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const frame = requestAnimationFrame(() => closeRef.current?.focus());
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(frame);
    };
  }, [onClose]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["console", "lead", leadId] });
    void queryClient.invalidateQueries({ queryKey: ["console", "leads"] });
  };

  const savePillarsFn = useServerFn(savePillars);
  const pillarMutation = useMutation({
    mutationFn: (values: Record<string, string>) => savePillarsFn({ data: { leadId, values } }),
    onSuccess: (result) => {
      setPillarErrors(result.errors ?? {});
      setSaveState(result.ok ? "Autosaved" : "Check the highlighted fields");
      invalidate();
    },
  });

  const statusFn = useServerFn(setLeadStatus);
  const statusMutation = useMutation({
    mutationFn: (status: DisplayStatus) => statusFn({ data: { leadId, status } }),
    onSuccess: () => {
      setStatusMenuOpen(false);
      invalidate();
    },
  });

  const sendFn = useServerFn(sendManualMessage);
  const sendMutation = useMutation({
    mutationFn: (body: string) => sendFn({ data: { leadId, body } }),
    onSuccess: () => {
      setCompose("");
      invalidate();
    },
  });

  const takeoverFn = useServerFn(setTakeover);
  const takeoverMutation = useMutation({
    mutationFn: (takeover: boolean) => takeoverFn({ data: { leadId, takeover } }),
    onSuccess: invalidate,
  });

  const cancelFn = useServerFn(cancelQueuedMessage);
  const cancelMutation = useMutation({
    mutationFn: (messageId: string) => cancelFn({ data: { messageId } }),
    onSuccess: invalidate,
  });

  const junkFn = useServerFn(markLeadJunk);
  const junkMutation = useMutation({
    mutationFn: () => junkFn({ data: { leadId } }),
    onSuccess: invalidate,
  });

  const restoreFn = useServerFn(restoreLead);
  const restoreMutation = useMutation({
    mutationFn: () => restoreFn({ data: { leadId } }),
    onSuccess: invalidate,
  });

  const approveFn = useServerFn(approveDraft);
  const approveMutation = useMutation({
    mutationFn: (input: { messageId: string; body: string }) => approveFn({ data: input }),
    onSuccess: () => {
      setBlipEdit(null);
      invalidate();
    },
  });

  const generateFn = useServerFn(generateDraft);
  const generateMutation = useMutation({
    mutationFn: () => generateFn({ data: { leadId } }),
    onSuccess: invalidate,
  });

  if (!lead) {
    return (
      <div className="panel-layer is-open" aria-hidden="false">
        <section className="detail-panel lead-panel" role="dialog" aria-modal="true">
          <header className="panel-header">
            <div>
              <h2>Loading lead</h2>
            </div>
            <button
              className="icon-button"
              type="button"
              onClick={onClose}
              aria-label="Close lead detail"
              ref={closeRef}
            >
              <Icon name="close" />
            </button>
          </header>
        </section>
      </div>
    );
  }

  const [statusLabel, statusTone] = STATUS_MAP[lead.displayStatus] ?? [lead.displayStatus, "muted"];
  const workflow = workflowCopy(lead);
  const complete = completedPillarCount(pillarSpecs, lead.pillars);
  const held = lead.flags.length > 0 && lead.displayStatus !== "closed";
  const valueFor = (spec: PillarSpec) =>
    draft[spec.key] ?? pillarText(lead.pillars[spec.key]);

  const commitPillar = (spec: PillarSpec, value: string) => {
    setDraft((current) => ({ ...current, [spec.key]: value }));
    setSaveState("Saving");
    pillarMutation.mutate({ ...draft, [spec.key]: value });
  };

  return (
    <div className="panel-layer is-open" aria-hidden="false" onClick={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section
        className="detail-panel lead-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="leadPanelTitle"
      >
        <header className="panel-header">
          <div>
            <h2 id="leadPanelTitle">{lead.business}</h2>
            <p>
              <span>{lead.contact}</span>
              <span className="status" data-tone={statusTone}>
                {statusLabel}
              </span>
            </p>
            <div className="contact-actions">
              {lead.phone ? (
                <a className="contact-link" href={`tel:${lead.phone.replace(/[^+\d]/g, "")}`}>
                  <Icon name="phone" /> {lead.phone}
                </a>
              ) : null}
              {lead.email ? (
                <a className="contact-link" href={`mailto:${lead.email}`}>
                  <Icon name="mail" /> {lead.email}
                </a>
              ) : null}
            </div>
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={onClose}
            aria-label="Close lead detail"
            ref={closeRef}
          >
            <Icon name="close" />
          </button>
        </header>

        <div className="panel-scroll">
          {held ? (
            <div className="approval-gate" data-drawer-message="current-action">
              <div className="gate-head">
                <Icon name="shield" />
                <h3>Held before texting</h3>
              </div>
              <p className="gate-copy">
                These checks stopped the first message. Review them before clearing the hold.
              </p>
              <div className="flag-list">
                {lead.flags.map((flag) => (
                  <span className="flag" key={flag}>
                    {flag}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="lead-panel-context" data-drawer-message="current-action">
              <div>
                <span className="context-kicker">What needs you</span>
                <strong>{workflow[0]}</strong>
                <span>{workflow[1]}</span>
              </div>
              <span className="context-state">{statusLabel}</span>
            </div>
          )}

          {(() => {
            // Blip drafts and holds are shown before the transcript, because the
            // draft is the thing that needs a decision (spec 5).
            const draft = [...lead.messages]
              .reverse()
              .find(
                (message) =>
                  message.direction === "outbound" &&
                  message.authored_by === "blip" &&
                  (message.status === "held" || message.status === "queued"),
              );
            if (!draft) {
              return (
                <div className="blip-draft-empty">
                  <span>No Blip draft waiting</span>
                  <button
                    className="button ghost"
                    type="button"
                    disabled={generateMutation.isPending}
                    onClick={() => generateMutation.mutate()}
                  >
                    <Icon name="spark" /> {generateMutation.isPending ? "Writing" : "Draft a reply"}
                  </button>
                </div>
              );
            }
            const violations = Array.isArray(
              (draft as { gate_violations?: unknown }).gate_violations,
            )
              ? ((draft as { gate_violations?: string[] }).gate_violations ?? [])
              : [];
            const heldReason = (draft as { held_reason?: string | null }).held_reason;
            return (
              <div className="blip-draft" data-status={draft.status}>
                <div className="blip-draft-head">
                  <Icon name="spark" />
                  <strong>Blip drafted this</strong>
                  <span className="status" data-tone={draft.status === "held" ? "attention" : "muted"}>
                    {draft.status === "held" ? "Held for you" : "Queued"}
                  </span>
                </div>
                <div className="grow-wrap" data-replicated-value={blipEdit ?? draft.body}>
                  <textarea
                    className="textarea"
                    rows={2}
                    aria-label="Blip draft"
                    value={blipEdit ?? draft.body}
                    onChange={(event) => setBlipEdit(event.target.value)}
                  />
                </div>
                {heldReason ? (
                  <p className="blip-draft-reason">
                    {heldReason.replace(/_/g, " ")}
                    {violations.length ? `: ${violations.join(", ")}` : ""}
                  </p>
                ) : null}
                <div className="blip-draft-actions">
                  <button
                    className="button ghost"
                    type="button"
                    disabled={generateMutation.isPending}
                    onClick={() => generateMutation.mutate()}
                  >
                    <Icon name="refresh" /> Rewrite
                  </button>
                  <button
                    className="button"
                    type="button"
                    disabled={approveMutation.isPending}
                    onClick={() =>
                      approveMutation.mutate({
                        messageId: draft.id,
                        body: (blipEdit ?? draft.body).trim(),
                      })
                    }
                  >
                    <Icon name="check" /> Approve and send
                  </button>
                </div>
              </div>
            );
          })()}

          <section className="detail-section conversation-section" data-drawer-section="conversation">
            <div className="drawer-section-head">
              <div>
                <h3>Conversation</h3>
                <p>
                  {lead.takenOver
                    ? "You are replying. Automation is paused."
                    : "Lead messages are yellow. Newest activity appears at the bottom."}
                </p>
              </div>
            </div>
            <div className="transcript" id={`transcript-${lead.id}`}>
              {lead.messages.length ? (
                lead.messages.map((message) => {
                  const outbound = message.direction === "outbound";
                  const queued = message.status === "queued" || message.status === "held";
                  const label = outbound
                    ? message.authored_by === "blip"
                      ? "Blip"
                      : "Alyx"
                    : "Lead";
                  const stamp = queued
                    ? `Sending ${relativeTime(message.send_after)}`
                    : relativeTime(message.sent_at ?? message.created_at);
                  return (
                    <div
                      className={`message ${outbound ? "is-outbound" : ""} ${queued ? "is-queued" : ""}`}
                      key={message.id}
                    >
                      {message.body}
                      <div className="message-meta">
                        <span>
                          {queued ? "Queued" : label} · {stamp}
                        </span>
                        {queued ? (
                          <button
                            className="cancel-queue"
                            type="button"
                            onClick={() => cancelMutation.mutate(message.id)}
                          >
                            Cancel
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="answer-line">
                  <span>Transcript</span>
                  <strong>No messages yet</strong>
                </div>
              )}
            </div>
            <form
              className="compose"
              onSubmit={(event) => {
                event.preventDefault();
                if (compose.trim()) sendMutation.mutate(compose.trim());
              }}
            >
              <label className="sr-only" htmlFor={`compose-${lead.id}`}>
                Write a message
              </label>
              <input
                className="input"
                id={`compose-${lead.id}`}
                placeholder="Write as Alyx"
                value={compose}
                onChange={(event) => setCompose(event.target.value)}
              />
              <button className="button" type="submit" aria-label="Send message">
                <Icon name="send" />
              </button>
            </form>
            <p className="takeover-note">
              {lead.takenOver ? "Automation is paused for this lead." : ""}
            </p>
          </section>

          <section className="detail-section" data-drawer-section="quote-pillars">
            <div className="drawer-section-head">
              <div>
                <h3>Quote pillars</h3>
                <p>
                  <span>
                    {complete} of {pillarSpecs.length} complete
                  </span>{" "}
                  <span className="pillar-save-state">{editingPillars ? saveState : ""}</span>
                </p>
              </div>
              <button
                className="section-text-action"
                type="button"
                onClick={() => setEditingPillars((value) => !value)}
              >
                {editingPillars ? "Done" : "Edit"}
              </button>
            </div>

            {editingPillars ? (
              <div className="pillar-grid">
                {pillarSpecs.map((spec) => {
                  const value = valueFor(spec);
                  const missing = !value.trim();
                  const error = pillarErrors[spec.key];
                  return (
                    <div className="pillar-field" key={spec.key}>
                      <label htmlFor={`pillar-${lead.id}-${spec.key}`}>{spec.label}</label>
                      <input
                        className="input"
                        id={`pillar-${lead.id}-${spec.key}`}
                        value={value}
                        aria-invalid={missing || Boolean(error)}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, [spec.key]: event.target.value }))
                        }
                        onBlur={(event) => commitPillar(spec, event.target.value)}
                      />
                      <p className="field-error">
                        {error ?? (missing ? "Required for a plan" : "")}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="pillar-summary-grid">
                {pillarSpecs.map((spec) => {
                  const missing = isMissingPillar(lead.pillars[spec.key]);
                  return (
                    <div
                      className={`pillar-summary-item ${missing ? "is-missing" : ""}`}
                      key={spec.key}
                    >
                      <span>{spec.label}</span>
                      <strong>{missing ? "Missing" : pillarText(lead.pillars[spec.key])}</strong>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="vertical-answers">
              {lead.vertical.length ? (
                lead.vertical.map((item) => (
                  <div className="answer-line" key={item[0]}>
                    <span>{item[0]}</span>
                    <strong>{item[1]}</strong>
                  </div>
                ))
              ) : (
                <div className="answer-line">
                  <span>Vertical questions</span>
                  <strong>None answered yet</strong>
                </div>
              )}
            </div>
          </section>

          {lead.plan ? (
            <section className="detail-section" data-drawer-section="plan">
              <div className="lead-plan-card">
                <div>
                  <span>
                    {lead.plan.tier} plan.{" "}
                    {lead.plan.status === "sent"
                      ? `${lead.plan.views} view${lead.plan.views === 1 ? "" : "s"}`
                      : "Ready for review"}
                  </span>
                  <strong>${lead.plan.monthly}/mo</strong>
                </div>
              </div>
            </section>
          ) : null}
        </div>

        <footer className="panel-footer lead-panel-footer">
          <div className="lead-status-control">
            <button
              className="button ghost"
              type="button"
              aria-expanded={statusMenuOpen}
              onClick={() => setStatusMenuOpen((value) => !value)}
            >
              Change status
            </button>
            <div className="lead-status-menu" hidden={!statusMenuOpen}>
              {LEAD_MANUAL_STATUS_OPTIONS.map(([status, label]) => (
                <button
                  className={`lead-status-option ${lead.displayStatus === status ? "is-current" : ""}`}
                  type="button"
                  key={status}
                  aria-pressed={lead.displayStatus === status}
                  onClick={() => statusMutation.mutate(status)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {held ? (
            <button
              className="button danger"
              type="button"
              onClick={() => junkMutation.mutate()}
            >
              Mark junk
            </button>
          ) : lead.displayStatus === "closed" ? (
            <button
              className="button ghost"
              type="button"
              onClick={() => restoreMutation.mutate()}
            >
              Restore lead
            </button>
          ) : lead.takenOver ? (
            <button
              className="button ghost"
              type="button"
              onClick={() => takeoverMutation.mutate(false)}
            >
              Resume Alyx
            </button>
          ) : (
            <button
              className="button ghost"
              type="button"
              onClick={() => takeoverMutation.mutate(true)}
            >
              Take over
            </button>
          )}

          {lead.phone ? (
            <a
              className="button lead-primary-action"
              href={`tel:${lead.phone.replace(/[^+\d]/g, "")}`}
            >
              <Icon name="phone" /> Call now
            </a>
          ) : (
            <a className="button lead-primary-action" href={`mailto:${lead.email}`}>
              <Icon name="mail" /> Email lead
            </a>
          )}
        </footer>
      </section>
    </div>
  );
}
