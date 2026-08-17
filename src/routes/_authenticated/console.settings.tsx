// Settings screen. Markup ported from renderSettings() and its control
// helpers in alyxlab-console.html. Autosaves; pillars save explicitly.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";

import { Icon } from "@/components/console/icons";
import { PILLAR_TYPE_COPY, type PillarSpec } from "@/lib/lead-status";
import {
  getConsoleSettings,
  saveNotifications,
  savePillarSpecs,
  saveTiming,
  setKillSwitch,
  type ConsoleSettings,
} from "@/lib/settings.functions";
import { formatClock } from "@/lib/timing";

export const Route = createFileRoute("/_authenticated/console/settings")({
  component: SettingsScreen,
});

const TIMEZONES = [
  "America/Chicago",
  "America/New_York",
  "America/Denver",
  "America/Los_Angeles",
];

const NOTIFICATION_ROWS: Array<[string, string, string, boolean]> = [
  ["planApproval", "Plan needs approval", "A proposal is ready", false],
  ["callRequested", "Call requested", "A lead asked to speak", false],
  ["leadReview", "Lead held for review", "Safety checks need a decision", false],
  ["paymentUnmatched", "Payment with no match", "Stripe could not find a lead", false],
  ["everyLead", "Every new lead", "Optional. This can become noisy.", true],
];

type Section = "timing" | "notifications" | "quiet" | "qualification";

function SettingsScreen() {
  const queryClient = useQueryClient();
  const fetchSettings = useServerFn(getConsoleSettings);
  const { data } = useQuery({
    queryKey: ["console", "settings"],
    queryFn: () => fetchSettings(),
  });

  const [open, setOpen] = useState<Record<Section, boolean>>({
    timing: true,
    notifications: true,
    quiet: true,
    qualification: true,
  });
  const [timingState, setTimingState] = useState("Autosaves");
  const [notifState, setNotifState] = useState("Autosaves");
  const [quietState, setQuietState] = useState("Autosaves");
  const [pillarState, setPillarState] = useState("Saved");
  const [timingError, setTimingError] = useState("");
  const [pillarError, setPillarError] = useState("");
  const [pillars, setPillars] = useState<PillarSpec[]>([]);
  const [pillarDirty, setPillarDirty] = useState(false);

  useEffect(() => {
    if (data) {
      setPillars(data.requiredPillars);
      setPillarDirty(false);
      setPillarState("Saved");
    }
  }, [data]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["console", "settings"] });

  const killFn = useServerFn(setKillSwitch);
  const killMutation = useMutation({
    mutationFn: (automation: boolean) => killFn({ data: { automation } }),
    onSuccess: () => void invalidate(),
  });

  const timingFn = useServerFn(saveTiming);
  const timingMutation = useMutation({
    mutationFn: (input: Parameters<typeof saveTiming>[0]["data"]) => timingFn({ data: input }),
    onSuccess: (result, variables) => {
      const quiet = "quietStart" in variables || "quietEnd" in variables || "timezone" in variables;
      if (!result.ok) {
        setTimingError(result.error ?? "");
        if (quiet) setQuietState("Not saved");
        else setTimingState("Not saved");
        return;
      }
      setTimingError("");
      if (quiet) setQuietState("Saved");
      else setTimingState("Saved");
      void invalidate();
    },
  });

  const notifFn = useServerFn(saveNotifications);
  const notifMutation = useMutation({
    mutationFn: (notifications: Record<string, boolean>) =>
      notifFn({ data: { notifications } }),
    onSuccess: () => {
      setNotifState("Saved");
      void invalidate();
    },
  });

  const pillarFn = useServerFn(savePillarSpecs);
  const pillarMutation = useMutation({
    mutationFn: (next: PillarSpec[]) => pillarFn({ data: { pillars: next } }),
    onSuccess: (result) => {
      if (!result.ok) {
        setPillarError(result.error ?? "");
        setPillarState("Unsaved changes");
        return;
      }
      setPillarError("");
      setPillarDirty(false);
      setPillarState("Saved");
      void invalidate();
    },
  });

  if (!data) {
    return (
      <section className="screen" aria-label="Settings">
        <article className="surface settings-card">
          <p>Loading settings</p>
        </article>
      </section>
    );
  }

  const settings: ConsoleSettings = data;
  const zone = settings.timezone.replace("America/", "").replace(/_/g, " ");

  const cardHead = (
    title: string,
    description: string,
    section: Section,
    status: string,
  ) => (
    <header className="settings-card-head">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <button
        className="settings-section-disclosure"
        type="button"
        aria-expanded={open[section]}
        aria-controls={`settings-body-${section}`}
        aria-label={`${open[section] ? "Collapse" : "Expand"} ${title}`}
        onClick={() => setOpen((current) => ({ ...current, [section]: !current[section] }))}
      >
        <Icon name="arrow" />
      </button>
      <span
        className={`settings-save-state ${status === "Unsaved changes" ? "is-dirty" : ""}`}
        aria-live="polite"
      >
        {status}
      </span>
    </header>
  );

  const numberRow = (
    title: string,
    subtitle: string,
    id: string,
    value: number,
    min: number,
    max: number,
    onCommit: (value: number) => void,
    unit?: string,
  ) => (
    <div className="setting-row">
      <label className="setting-copy" htmlFor={`setting-${id}`}>
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </label>
      <div className={`setting-control ${unit ? "" : "single"}`}>
        <input
          className="input"
          id={`setting-${id}`}
          type="number"
          min={min}
          max={max}
          inputMode="numeric"
          defaultValue={value}
          key={`${id}-${value}`}
          aria-label={title}
          onChange={() => setTimingState("Editing")}
          onBlur={(event) => {
            const next = Number(event.target.value);
            if (Number.isFinite(next) && next !== value) onCommit(next);
          }}
        />
        {unit ? <span className="range-separator">{unit}</span> : null}
      </div>
    </div>
  );

  return (
    <section className="screen settings-grid" aria-label="Settings">
      <article
        className={`surface settings-hero kill-switch ${settings.automation ? "" : "is-off"}`}
        id="killSwitchCard"
      >
        <div className="kill-head">
          <div className="kill-copy">
            <span className="settings-icon">
              <Icon name="spark" />
            </span>
            <div>
              <h2>{settings.automation ? "Automation is live" : "Automation is stopped"}</h2>
              <p>
                {settings.automation
                  ? "Qualified leads are moving through the configured response flow."
                  : "No automatic texts will be sent until this is turned back on."}
              </p>
            </div>
          </div>
          <label className="switch">
            <input
              id="automationMaster"
              type="checkbox"
              checked={settings.automation}
              aria-label="Automation master switch"
              onChange={(event) => killMutation.mutate(event.target.checked)}
            />
            <span className="switch-track"></span>
          </label>
        </div>
      </article>

      <div className="settings-layout">
        <div className="settings-column">
          <article
            className={`surface settings-card ${open.timing ? "" : "is-mobile-collapsed"}`}
            data-settings-section-card="timing"
          >
            {cardHead(
              "Conversation timing",
              "Keep replies prompt without making the automation feel mechanical.",
              "timing",
              timingState,
            )}
            <div className="settings-card-body" id="settings-body-timing">
              {numberRow(
                "First follow-up",
                "After a new qualified lead",
                "firstFollowUpValue",
                settings.firstFollowupMin,
                1,
                7200,
                (value) => timingMutation.mutate({ firstFollowupMin: value }),
                "min",
              )}
              <div className="setting-row">
                <div className="setting-copy" id="replyDelayLabel">
                  <strong>Reply delay range</strong>
                  <span>A natural pause between messages</span>
                </div>
                <div className="setting-control range" role="group" aria-labelledby="replyDelayLabel">
                  <input
                    className="input"
                    type="number"
                    min={1}
                    max={18000}
                    inputMode="numeric"
                    key={`min-${settings.replyDelayMinSec}`}
                    defaultValue={settings.replyDelayMinSec}
                    aria-label="Minimum reply delay"
                    onBlur={(event) =>
                      timingMutation.mutate({
                        replyDelayMinSec: Number(event.target.value),
                        replyDelayMaxSec: settings.replyDelayMaxSec,
                      })
                    }
                  />
                  <span className="range-separator">to</span>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    max={18000}
                    inputMode="numeric"
                    key={`max-${settings.replyDelayMaxSec}`}
                    defaultValue={settings.replyDelayMaxSec}
                    aria-label="Maximum reply delay"
                    onBlur={(event) =>
                      timingMutation.mutate({
                        replyDelayMinSec: settings.replyDelayMinSec,
                        replyDelayMaxSec: Number(event.target.value),
                      })
                    }
                  />
                  <span className="range-separator">sec</span>
                </div>
              </div>
              <p className="setting-error" role="alert">
                {timingError}
              </p>
              {numberRow(
                "Stall nudge",
                "After the last unanswered text",
                "stallNudgeValue",
                settings.stallNudgeHours,
                1,
                1728,
                (value) => timingMutation.mutate({ stallNudgeHours: value }),
                "hrs",
              )}
              {numberRow(
                "Maximum nudges",
                "Then the lead becomes cold",
                "maximumNudges",
                settings.maxNudges,
                0,
                5,
                (value) => timingMutation.mutate({ maxNudges: value }),
              )}
            </div>
          </article>
        </div>

        <div className="settings-column">
          <article
            className={`surface settings-card ${open.notifications ? "" : "is-mobile-collapsed"}`}
            data-settings-section-card="notifications"
          >
            {cardHead(
              "Text notifications",
              "Only events requiring a decision should interrupt the day.",
              "notifications",
              notifState,
            )}
            <div className="settings-card-body" id="settings-body-notifications">
              {NOTIFICATION_ROWS.map(([key, title, subtitle, optional]) => (
                <div
                  className={`setting-row notification-row ${optional ? "is-optional" : ""}`}
                  key={key}
                >
                  <div className="setting-copy">
                    <strong>{title}</strong>
                    <span>{subtitle}</span>
                  </div>
                  <label className="switch">
                    <input
                      id={`setting-${key}`}
                      type="checkbox"
                      checked={settings.notifications[key] ?? false}
                      aria-label={title}
                      onChange={(event) => {
                        setNotifState("Saving");
                        notifMutation.mutate({
                          ...settings.notifications,
                          [key]: event.target.checked,
                        });
                      }}
                    />
                    <span className="switch-track"></span>
                  </label>
                </div>
              ))}
            </div>
          </article>
        </div>

        <article
          className={`surface settings-card settings-wide settings-quiet-card ${
            open.quiet ? "" : "is-mobile-collapsed"
          }`}
          data-settings-section-card="quiet"
        >
          {cardHead(
            "Quiet hours",
            "Messages wait until the local sending window opens.",
            "quiet",
            quietState,
          )}
          <div className="settings-card-body" id="settings-body-quiet">
            <div className="quiet-controls-grid">
              <div className="setting-row">
                <label className="setting-copy" htmlFor="setting-quietStart">
                  <strong>Start</strong>
                  <span>Local sending pause begins</span>
                </label>
                <div className="setting-control single">
                  <input
                    className="input"
                    id="setting-quietStart"
                    type="time"
                    defaultValue={settings.quietStart}
                    key={`qs-${settings.quietStart}`}
                    aria-label="Start time"
                    onBlur={(event) =>
                      timingMutation.mutate({ quietStart: event.target.value })
                    }
                  />
                </div>
              </div>
              <div className="setting-row">
                <label className="setting-copy" htmlFor="setting-quietEnd">
                  <strong>End</strong>
                  <span>Automatic sending resumes</span>
                </label>
                <div className="setting-control single">
                  <input
                    className="input"
                    id="setting-quietEnd"
                    type="time"
                    defaultValue={settings.quietEnd}
                    key={`qe-${settings.quietEnd}`}
                    aria-label="End time"
                    onBlur={(event) => timingMutation.mutate({ quietEnd: event.target.value })}
                  />
                </div>
              </div>
              <div className="setting-row">
                <label className="setting-copy" htmlFor="setting-timezone">
                  <strong>Timezone</strong>
                  <span>Used for all scheduled texts</span>
                </label>
                <div className="setting-control single">
                  <select
                    className="select"
                    id="setting-timezone"
                    value={settings.timezone}
                    onChange={(event) => timingMutation.mutate({ timezone: event.target.value })}
                  >
                    {TIMEZONES.map((tz) => (
                      <option value={tz} key={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="quiet-summary">
              <span>Messages pause</span>
              <strong>
                {formatClock(settings.quietStart)} to {formatClock(settings.quietEnd)} · {zone}
              </strong>
            </div>
          </div>
        </article>

        <article
          className={`surface settings-card settings-wide ${
            open.qualification ? "" : "is-mobile-collapsed"
          }`}
          data-settings-section-card="qualification"
        >
          {cardHead(
            "Qualification pillars",
            "The facts every quote depends on. What Blip asks about them lives in Blip.",
            "qualification",
            pillarDirty ? "Unsaved changes" : pillarState,
          )}
          <div className="settings-card-body" id="settings-body-qualification">
            <div className="questions-workspace">
              <section className="pillar-group" aria-labelledby="pillarsTitle">
                <header className="pillar-head">
                  <div>
                    <h3 id="pillarsTitle">{pillars.length} required</h3>
                    <p>Blip decides how to ask. These decide what a valid answer looks like.</p>
                  </div>
                </header>
                <div className="pillar-list">
                  {pillars.map((pillar, index) => {
                    const [typeLabel] = PILLAR_TYPE_COPY[pillar.type] ?? PILLAR_TYPE_COPY.choice;
                    const update = (patch: Partial<PillarSpec>) => {
                      setPillars((current) =>
                        current.map((item, i) => (i === index ? { ...item, ...patch } : item)),
                      );
                      setPillarDirty(true);
                    };
                    const move = (direction: -1 | 1) => {
                      setPillars((current) => {
                        const next = [...current];
                        const target = index + direction;
                        if (target < 0 || target >= next.length) return current;
                        [next[index], next[target]] = [next[target]!, next[index]!];
                        return next;
                      });
                      setPillarDirty(true);
                    };
                    return (
                      <article className="pillar-card" data-key={`pillar-${pillar.key}`} key={pillar.key}>
                        <div className="pillar-index tabular">
                          {String(index + 1).padStart(2, "0")}
                        </div>
                        <div className="pillar-body">
                          <div className="pillar-title-row">
                            <input
                              className="input pillar-name"
                              value={pillar.label}
                              aria-label="Pillar name"
                              onChange={(event) => update({ label: event.target.value })}
                            />
                            <span className="pillar-type" data-type={pillar.type}>
                              {typeLabel}
                            </span>
                          </div>
                          <label className="pillar-ask">
                            <span>Blip asks</span>
                            <input
                              className="input"
                              value={pillar.asks ?? ""}
                              aria-label="How Blip asks for it"
                              onChange={(event) => update({ asks: event.target.value })}
                            />
                          </label>
                          <p className="pillar-feeds">
                            <Icon name="lock" /> {pillar.feeds}
                          </p>
                        </div>
                        <div className="pillar-controls">
                          <button
                            type="button"
                            aria-label="Move up"
                            disabled={index === 0}
                            onClick={() => move(-1)}
                          >
                            <Icon name="arrow" />
                          </button>
                          <button
                            type="button"
                            aria-label="Move down"
                            disabled={index === pillars.length - 1}
                            onClick={() => move(1)}
                          >
                            <Icon name="arrow" />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
                <p className="pillar-note">
                  Every pillar feeds pricing. Removing one is a deploy, not a setting.
                </p>
              </section>
            </div>
            <div className="settings-card-actions">
              <p className="setting-error" role="alert">
                {pillarError}
              </p>
              <button
                className="button settings-primary"
                type="button"
                onClick={() => pillarMutation.mutate(pillars)}
              >
                <Icon name="save" /> Save pillars
              </button>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
