// Blip screen. Markup ported from renderBlip()/renderBehaviorPanel()/
// renderLogicPanel()/renderKnowledgePanel()/renderLearningPanel() and
// openBlipPrompt() in alyxlab-console.html.
//
// Editing anything here edits the DRAFT. Production reads the active release
// snapshot only, so nothing changes for leads until the draft is promoted.
// Autonomy is runtime state, outside any release, so it applies instantly.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";

import { Icon } from "@/components/console/icons";
import {
  discardBlipDraft,
  fileCorrection,
  getBlipScreen,
  getCompiledPrompt,
  promoteBlipDraft,
  runReplay,
  saveBlipArea,
  selectCorrectionAreas,
} from "@/lib/blip.functions";
import {
  AUTONOMY_LEVELS,
  BLIP_AREA_META,
  SIX_LIMITS,
  TEACH_OPTIONS,
  type BlipArea,
  type BlipConfig,
} from "@/lib/blip/config";

export const Route = createFileRoute("/_authenticated/console/blip")({
  component: BlipScreen,
});

function BlipScreen() {
  const queryClient = useQueryClient();
  const fetchScreen = useServerFn(getBlipScreen);
  const [area, setArea] = useState<BlipArea>("behavior");
  const [vertical, setVertical] = useState("barbershop");
  const [banInput, setBanInput] = useState("");
  const [scopeInput, setScopeInput] = useState("");
  const [promptOpen, setPromptOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [local, setLocal] = useState<BlipConfig | null>(null);
  const [selections, setSelections] = useState<Record<string, string[]>>({});

  const { data } = useQuery({
    queryKey: ["console", "blip"],
    queryFn: () => fetchScreen({}),
  });

  useEffect(() => {
    if (data?.config) setLocal(data.config);
  }, [data?.config]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["console", "blip"] });

  const saveArea = useServerFn(saveBlipArea);
  const saveMutation = useMutation({
    mutationFn: (input: { area: "behavior" | "logic" | "knowledge"; value: unknown }) =>
      saveArea({ data: input }),
    onSuccess: () => void invalidate(),
  });

  const discardFn = useServerFn(discardBlipDraft);
  const discardMutation = useMutation({
    mutationFn: () => discardFn({}),
    onSuccess: () => {
      setNotice("Draft discarded.");
      void invalidate();
    },
  });

  const promoteFn = useServerFn(promoteBlipDraft);
  const promoteMutation = useMutation({
    mutationFn: () => promoteFn({}),
    onSuccess: (result) => {
      setNotice(
        result.ok
          ? `Promoted to v${result.number}. Every message from now on is stamped with it.`
          : result.errors.join(" "),
      );
      void invalidate();
    },
  });

  const replayFn = useServerFn(runReplay);
  const replayMutation = useMutation({
    mutationFn: () => replayFn({}),
    onSuccess: (result) => {
      setNotice(`Replay ran against ${result.conversations} conversations.`);
      void invalidate();
    },
  });

  const selectFn = useServerFn(selectCorrectionAreas);
  const selectMutation = useMutation({
    mutationFn: (input: { correctionId: string; areas: string[] }) => selectFn({ data: input }),
  });

  const fileFn = useServerFn(fileCorrection);
  const fileMutation = useMutation({
    mutationFn: (input: { correctionId: string; areas: string[] }) => fileFn({ data: input }),
    onSuccess: () => {
      setNotice("Correction filed.");
      void invalidate();
    },
  });

  const config = local;
  const dirty = useMemo(() => {
    if (!config || !data) return false;
    return JSON.stringify(config) !== JSON.stringify(data.config) || data.dirty;
  }, [config, data]);

  if (!data || !config) {
    return (
      <section className="screen" aria-label="Blip">
        <article className="surface blip-panel">
          <p className="blip-empty">Loading Blip.</p>
        </article>
      </section>
    );
  }

  const patchBehavior = (patch: Partial<BlipConfig["behavior"]>) => {
    const next = { ...config, behavior: { ...config.behavior, ...patch } };
    setLocal(next);
    saveMutation.mutate({ area: "behavior", value: next.behavior });
  };
  const patchLogic = (patch: Partial<BlipConfig["logic"]>) => {
    const next = { ...config, logic: { ...config.logic, ...patch } };
    setLocal(next);
    saveMutation.mutate({ area: "logic", value: next.logic });
  };
  const patchKnowledge = (patch: Partial<BlipConfig["knowledge"]>) => {
    const next = { ...config, knowledge: { ...config.knowledge, ...patch } };
    setLocal(next);
    saveMutation.mutate({ area: "knowledge", value: next.knowledge });
  };

  const [areaTitle, areaBlurb] = BLIP_AREA_META[area];
  const selectedFor = (correction: { id: string; selected: string[] }) =>
    selections[correction.id] ?? correction.selected;

  const toggleSelection = (correction: { id: string; selected: string[] }, value: string) => {
    const current = selectedFor(correction);
    const next =
      value === "none"
        ? current.includes("none")
          ? []
          : ["none"]
        : current.includes(value)
          ? current.filter((item) => item !== value)
          : [...current.filter((item) => item !== "none"), value];
    setSelections((all) => ({ ...all, [correction.id]: next }));
    selectMutation.mutate({ correctionId: correction.id, areas: next });
  };

  return (
    <section className="screen-stack" aria-label="Blip">
      <article className="blip-banner">
        <div className="blip-banner-lead">
          <span className="roster-kicker">Release v{data.activeNumber} live</span>
          <h2>Blip drafts. You send.</h2>
          <p>Leads never meet Blip. They believe they are texting you, because they are.</p>
          <div className="autonomy" role="group" aria-label="Autonomy level">
            {AUTONOMY_LEVELS.map(([id, label]) => (
              <AutonomyButton
                key={id}
                id={id}
                label={label}
                active={data.autonomy === id}
                onDone={(message) => {
                  setNotice(message);
                  void invalidate();
                }}
              />
            ))}
          </div>
        </div>
        <div className="blip-banner-figures">
          <div>
            <span>Unedited sends</span>
            <strong className="tabular">{data.metrics.uneditedRate}%</strong>
          </div>
          <div>
            <span>Held for you</span>
            <strong className="tabular is-attention">{data.metrics.heldForYou}</strong>
          </div>
          <div>
            <span>Corrections</span>
            <strong className="tabular">{data.metrics.openCorrections}</strong>
          </div>
        </div>
      </article>

      <div className={`draft-bar surface ${dirty ? "is-dirty" : ""}`}>
        <div className="draft-copy">
          <strong>
            {dirty ? `Draft v${data.activeNumber + 1}` : `No changes since v${data.activeNumber}`}
          </strong>
          <span>
            {notice ||
              (dirty
                ? "Edits are held in the draft. Nothing changes for leads until you promote it."
                : "Edit anything below and it lands in a draft first.")}
          </span>
        </div>
        <div className="draft-actions">
          <button className="button ghost" type="button" onClick={() => setPromptOpen(true)}>
            <Icon name="eye" /> View compiled prompt
          </button>
          <button
            className="button ghost"
            type="button"
            disabled={!dirty || discardMutation.isPending}
            onClick={() => discardMutation.mutate()}
          >
            Discard
          </button>
          <button
            className="button primary-pulse"
            type="button"
            disabled={!dirty || promoteMutation.isPending}
            onClick={() => promoteMutation.mutate()}
          >
            Promote to v{data.activeNumber + 1}
          </button>
        </div>
      </div>

      <div className="section-heading">
        <h2>What you can shape</h2>
        <span>
          {areaTitle} &middot; {areaBlurb}
        </span>
      </div>
      <div className="blip-layout">
        <nav className="blip-tabs" aria-label="Blip configuration areas">
          {(Object.keys(BLIP_AREA_META) as BlipArea[]).map((key) => {
            const [title, blurb] = BLIP_AREA_META[key];
            return (
              <button
                key={key}
                className={`blip-tab ${area === key ? "is-active" : ""}`}
                type="button"
                aria-pressed={area === key}
                onClick={() => setArea(key)}
              >
                <strong>{title}</strong>
                <span>{blurb}</span>
              </button>
            );
          })}
        </nav>
        <article className="surface blip-panel">
          {area === "behavior" && (
            <>
              <BlipRow
                title="Sentence ceiling"
                note="Enforced by the validation gate, not just asked for in the prompt."
                control={
                  <div className="stepper">
                    <button
                      type="button"
                      aria-label="Fewer sentences"
                      onClick={() =>
                        patchBehavior({
                          maxSentences: Math.max(1, config.behavior.maxSentences - 1),
                        })
                      }
                    >
                      &minus;
                    </button>
                    <span className="tabular">{config.behavior.maxSentences}</span>
                    <button
                      type="button"
                      aria-label="More sentences"
                      onClick={() =>
                        patchBehavior({
                          maxSentences: Math.min(6, config.behavior.maxSentences + 1),
                        })
                      }
                    >
                      +
                    </button>
                  </div>
                }
              />
              <BlipRow
                title="Mirror their words"
                note="If they say chairs, Blip says chairs."
                control={
                  <Switch
                    label="Mirror their words"
                    on={config.behavior.mirroring}
                    onChange={(on) => patchBehavior({ mirroring: on })}
                  />
                }
              />
              <BlipRow
                title="Lowercase openings"
                note="Sentences may start lowercase, the way people text."
                control={
                  <Switch
                    label="Lowercase openings"
                    on={config.behavior.lowercaseOpenings}
                    onChange={(on) => patchBehavior({ lowercaseOpenings: on })}
                  />
                }
              />
              <BlipRow
                title="No em dashes"
                note=""
                control={
                  <Switch
                    label="No em dashes"
                    on={config.behavior.noEmDash}
                    onChange={(on) => patchBehavior({ noEmDash: on })}
                  />
                }
              />
              <BlipRow
                title="No emoji"
                note=""
                control={
                  <Switch
                    label="No emoji"
                    on={config.behavior.noEmoji}
                    onChange={(on) => patchBehavior({ noEmoji: on })}
                  />
                }
              />
              <BlipRow
                title="No exclamation points"
                note=""
                control={
                  <Switch
                    label="No exclamation points"
                    on={config.behavior.noExclamation}
                    onChange={(on) => patchBehavior({ noExclamation: on })}
                  />
                }
              />
              <div className="blip-block">
                <div className="blip-block-head">
                  <strong>Banned words</strong>
                  <span>
                    {config.behavior.bannedWords.length} terms &middot; a reply containing one is
                    held, not sent
                  </span>
                </div>
                <div className="chip-field">
                  {config.behavior.bannedWords.map((word) => (
                    <span className="word-chip" key={word}>
                      {word}
                      <button
                        type="button"
                        aria-label={`Remove ${word}`}
                        onClick={() =>
                          patchBehavior({
                            bannedWords: config.behavior.bannedWords.filter((item) => item !== word),
                          })
                        }
                      >
                        <Icon name="close" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="chip-add">
                  <input
                    className="input"
                    placeholder="Add a word or phrase"
                    autoComplete="off"
                    value={banInput}
                    onChange={(event) => setBanInput(event.target.value)}
                  />
                  <button
                    className="button ghost"
                    type="button"
                    onClick={() => {
                      const word = banInput.trim();
                      if (!word || config.behavior.bannedWords.includes(word)) return;
                      patchBehavior({ bannedWords: [...config.behavior.bannedWords, word] });
                      setBanInput("");
                    }}
                  >
                    <Icon name="plus" /> Add
                  </button>
                </div>
              </div>
            </>
          )}

          {area === "logic" && (
            <>
              <BlipRow
                title="Stall nudges"
                note="How many times Blip follows up before it stops."
                control={
                  <div className="stepper">
                    <button
                      type="button"
                      aria-label="Fewer nudges"
                      onClick={() =>
                        patchLogic({ stallNudges: Math.max(0, config.logic.stallNudges - 1) })
                      }
                    >
                      &minus;
                    </button>
                    <span className="tabular">{config.logic.stallNudges}</span>
                    <button
                      type="button"
                      aria-label="More nudges"
                      onClick={() =>
                        patchLogic({ stallNudges: Math.min(5, config.logic.stallNudges + 1) })
                      }
                    >
                      +
                    </button>
                  </div>
                }
              />
              <BlipRow
                title="Escalate unknown questions"
                note="Send a holding line and flag it for you rather than guessing."
                control={
                  <Switch
                    label="Escalate unknown questions"
                    on={config.logic.escalateUnknown}
                    onChange={(on) => patchLogic({ escalateUnknown: on })}
                  />
                }
              />
              <BlipRow
                locked
                title="Stop asking after a call request"
                note="A hard limit. It cannot be turned off here."
                control={
                  <span className="locked-pill">
                    <Icon name="lock" /> Always on
                  </span>
                }
              />
              <div className="blip-block">
                <div className="blip-block-head">
                  <strong>Local service questions</strong>
                  <span>Short enough to answer in four words. Each one sets a tier floor.</span>
                </div>
                <div className="vertical-picker" role="tablist" aria-label="Business type">
                  {Object.entries(config.logic.verticalQuestions).map(([key, set]) => (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      className={`vertical-chip ${vertical === key ? "is-active" : ""}`}
                      aria-selected={vertical === key}
                      onClick={() => setVertical(key)}
                    >
                      {set.label}
                    </button>
                  ))}
                </div>
                <div className="vq-list">
                  {(config.logic.verticalQuestions[vertical]?.questions ?? []).map((item, index) => (
                    <div className="vq-row" key={`${vertical}-${index}`}>
                      <span className="vq-index tabular">{index + 1}</span>
                      <input
                        className="input vq-input"
                        value={item.q}
                        aria-label={`Question ${index + 1}`}
                        onChange={(event) => {
                          const sets = { ...config.logic.verticalQuestions };
                          const set = sets[vertical]!;
                          const questions = set.questions.map((question, position) =>
                            position === index ? { ...question, q: event.target.value } : question,
                          );
                          sets[vertical] = { ...set, questions };
                          setLocal({
                            ...config,
                            logic: { ...config.logic, verticalQuestions: sets },
                          });
                        }}
                        onBlur={() => patchLogic({ verticalQuestions: config.logic.verticalQuestions })}
                      />
                      <span className="vq-tag" title={`Sets the ${item.tag} capability floor`}>
                        {item.tag}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="blip-block">
                <div className="blip-block-head">
                  <strong>Struggle tags</strong>
                  <span>
                    Blip decides which apply. The pricing ruleset decides what each is worth.
                  </span>
                </div>
                <div className="tag-rows">
                  {data.tagFloors.map(([tag, floor]) => (
                    <div className="tag-row" key={tag}>
                      <label className="switch switch-sm" aria-label={tag.replace(/_/g, " ")}>
                        <input
                          type="checkbox"
                          checked={config.logic.tagsEnabled[tag] === true}
                          onChange={(event) =>
                            patchLogic({
                              tagsEnabled: {
                                ...config.logic.tagsEnabled,
                                [tag]: event.target.checked,
                              },
                            })
                          }
                        />
                        <span className="switch-track" />
                      </label>
                      <code>{tag}</code>
                      <span className="tag-floor">
                        <Icon name="lock" /> {floor}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {area === "knowledge" && (
            <>
              <div className="blip-block is-first">
                <div className="blip-block-head">
                  <strong>Approved answers</strong>
                  <span>
                    {config.knowledge.approved.length} &middot; the exact words Blip may use for
                    questions it hears constantly
                  </span>
                </div>
                <div className="qa-list">
                  {config.knowledge.approved.map((entry) => (
                    <div className="qa-row" key={entry.id}>
                      <span className="qa-tag">Q</span>
                      <input
                        className="input qa-field"
                        value={entry.q}
                        placeholder="what they ask"
                        aria-label="Question"
                        onChange={(event) =>
                          setLocal({
                            ...config,
                            knowledge: {
                              ...config.knowledge,
                              approved: config.knowledge.approved.map((item) =>
                                item.id === entry.id ? { ...item, q: event.target.value } : item,
                              ),
                            },
                          })
                        }
                        onBlur={() => patchKnowledge({ approved: config.knowledge.approved })}
                      />
                      <span className="qa-tag is-answer">A</span>
                      <div className="grow-wrap" data-replicated-value={entry.a}>
                        <textarea
                          className="textarea qa-field"
                          rows={1}
                          placeholder="what Blip says back"
                          aria-label="Answer"
                          value={entry.a}
                          onChange={(event) =>
                            setLocal({
                              ...config,
                              knowledge: {
                                ...config.knowledge,
                                approved: config.knowledge.approved.map((item) =>
                                  item.id === entry.id ? { ...item, a: event.target.value } : item,
                                ),
                              },
                            })
                          }
                          onBlur={() => patchKnowledge({ approved: config.knowledge.approved })}
                        />
                      </div>
                      <button
                        className="qa-remove"
                        type="button"
                        aria-label="Remove answer"
                        onClick={() =>
                          patchKnowledge({
                            approved: config.knowledge.approved.filter(
                              (item) => item.id !== entry.id,
                            ),
                          })
                        }
                      >
                        <Icon name="close" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  className="button ghost qa-add"
                  type="button"
                  onClick={() =>
                    patchKnowledge({
                      approved: [
                        ...config.knowledge.approved,
                        { id: `k${Date.now()}`, q: "", a: "" },
                      ],
                    })
                  }
                >
                  <Icon name="plus" /> Add answer
                </button>
              </div>
              <div className="blip-block">
                <div className="blip-block-head">
                  <strong>Will not do</strong>
                  <span>Blip refuses these plainly instead of improvising</span>
                </div>
                <div className="chip-field">
                  {config.knowledge.scopeOut.map((item) => (
                    <span className="word-chip" key={item}>
                      {item}
                      <button
                        type="button"
                        aria-label={`Remove ${item}`}
                        onClick={() =>
                          patchKnowledge({
                            scopeOut: config.knowledge.scopeOut.filter((value) => value !== item),
                          })
                        }
                      >
                        <Icon name="close" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="chip-add">
                  <input
                    className="input"
                    placeholder="Add something Blip will not do"
                    autoComplete="off"
                    value={scopeInput}
                    onChange={(event) => setScopeInput(event.target.value)}
                  />
                  <button
                    className="button ghost"
                    type="button"
                    onClick={() => {
                      const item = scopeInput.trim();
                      if (!item || config.knowledge.scopeOut.includes(item)) return;
                      patchKnowledge({ scopeOut: [...config.knowledge.scopeOut, item] });
                      setScopeInput("");
                    }}
                  >
                    <Icon name="plus" /> Add
                  </button>
                </div>
              </div>
              <BlipRow
                locked
                title="Can do"
                note="Read from the feature catalog. Blip cannot promise anything outside it."
                control={
                  <span className="locked-pill">
                    <Icon name="lock" /> {data.featureCount} features
                  </span>
                }
              />
            </>
          )}

          {area === "learning" && (
            <>
              <div className="blip-block is-first">
                <div className="blip-block-head">
                  <strong>Corrections</strong>
                  <span>
                    {data.corrections.length} waiting &middot; every time you rewrite a draft, it
                    lands here
                  </span>
                </div>
                <p className="teach-guide">
                  Pick what went <em>wrong</em>, not what it was about. More than one can be true.
                </p>
                {data.corrections.length ? (
                  <div className="correction-list">
                    {data.corrections.map((correction) => {
                      const selected = selectedFor(correction);
                      const feeds = selected.filter((item) => item !== "none");
                      return (
                        <div className="correction" key={correction.id}>
                          <div className="correction-top">
                            <span className="correction-lead">{correction.lead}</span>
                            <span className="correction-why">
                              Blip thinks it{" "}
                              {correction.signals.map((signal) => signal.why).join(", and it ")}
                            </span>
                          </div>
                          <div className="correction-pair">
                            <div className="correction-side">
                              <span>Blip wrote</span>
                              <p>{correction.draft}</p>
                            </div>
                            <div className="correction-side is-actual">
                              <span>You sent</span>
                              <p>{correction.actual}</p>
                            </div>
                          </div>
                          <div className="teach-options">
                            {TEACH_OPTIONS.map(([value, label, hint]) => (
                              <button
                                key={value}
                                type="button"
                                className={`teach-option ${selected.includes(value) ? "is-on" : ""} ${
                                  value === "none" ? "is-none" : ""
                                }`}
                                aria-pressed={selected.includes(value)}
                                onClick={() => toggleSelection(correction, value)}
                              >
                                <strong>{label}</strong>
                                <span>{hint}</span>
                              </button>
                            ))}
                          </div>
                          <div className="teach-footer">
                            <span>
                              {feeds.length
                                ? `Feeds ${feeds
                                    .map((item) => BLIP_AREA_META[item as BlipArea]?.[0] ?? "Example")
                                    .join(" and ")} in the next draft`
                                : "Nothing will be learned from this one"}
                            </span>
                            <button
                              className="file-it"
                              type="button"
                              aria-label="File this correction"
                              title="File it"
                              onClick={() =>
                                fileMutation.mutate({
                                  correctionId: correction.id,
                                  areas: selected,
                                })
                              }
                            >
                              <Icon name="send" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="blip-empty">
                    Every correction has been filed. New ones appear here when you rewrite a draft.
                  </p>
                )}
              </div>
              <div className="blip-block">
                <div className="blip-block-head">
                  <strong>Replay</strong>
                  <span>Run a draft against the last 20 conversations before promoting it</span>
                </div>
                <div className="replay-row">
                  <div className="replay-scores">
                    <div>
                      <span>Banned hits</span>
                      <strong className="tabular">{data.replay?.bannedHits ?? 0}</strong>
                    </div>
                    <div>
                      <span>Repetition</span>
                      <strong className="tabular">{data.replay?.repetition ?? 0}</strong>
                    </div>
                    <div>
                      <span>Wrong next ask</span>
                      <strong className="tabular">{data.replay?.wrongNextAsk ?? 0}</strong>
                    </div>
                    <div>
                      <span>Price leaks</span>
                      <strong className="tabular">{data.replay?.priceLeaks ?? 0}</strong>
                    </div>
                  </div>
                  <button
                    className="button ghost"
                    type="button"
                    disabled={replayMutation.isPending}
                    onClick={() => replayMutation.mutate()}
                  >
                    <Icon name="refresh" /> Run replay
                  </button>
                </div>
              </div>
            </>
          )}
        </article>
      </div>

      <article className="surface blip-limits">
        <header>
          <h3>Six limits Blip cannot cross</h3>
          <span>Read only</span>
        </header>
        <ul>
          {SIX_LIMITS.map((limit) => (
            <li key={limit}>{limit}</li>
          ))}
        </ul>
      </article>

      {promptOpen && <CompiledPromptPanel onClose={() => setPromptOpen(false)} />}
    </section>
  );
}

function BlipRow({
  title,
  note,
  control,
  locked = false,
}: {
  title: string;
  note: string;
  control: React.ReactNode;
  locked?: boolean;
}) {
  return (
    <div className={`blip-row ${locked ? "is-locked" : ""}`}>
      <div className="blip-row-copy">
        <strong>{title}</strong>
        <span>{note}</span>
      </div>
      <div className="blip-row-control">{control}</div>
    </div>
  );
}

function Switch({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <label className="switch" aria-label={label}>
      <input type="checkbox" checked={on} onChange={(event) => onChange(event.target.checked)} />
      <span className="switch-track" />
    </label>
  );
}

function AutonomyButton({
  id,
  label,
  active,
  onDone,
}: {
  id: string;
  label: string;
  active: boolean;
  onDone: (message: string) => void;
}) {
  const setLevel = useServerFn(
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    autonomyFn,
  );
  const mutation = useMutation({
    mutationFn: () => setLevel({ data: { level: id as "draft" | "assisted" | "live" } }),
    onSuccess: () =>
      onDone(
        id === "draft"
          ? "Draft only. Blip writes, you send."
          : id === "assisted"
            ? "Assisted. Routine questions send, anything unusual holds."
            : "Live. Blip runs the flow inside the precedence stack.",
      ),
  });
  return (
    <button
      className={`autonomy-option ${active ? "is-active" : ""}`}
      type="button"
      aria-pressed={active}
      disabled={mutation.isPending}
      onClick={() => mutation.mutate()}
    >
      {label}
    </button>
  );
}

function CompiledPromptPanel({ onClose }: { onClose: () => void }) {
  const fetchPrompt = useServerFn(getCompiledPrompt);
  const { data } = useQuery({
    queryKey: ["console", "blip", "prompt"],
    queryFn: () => fetchPrompt({}),
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="panel-layer is-open"
      aria-hidden="false"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="detail-panel prompt-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="promptTitle"
      >
        <header className="prompt-head">
          <div>
            <h2 id="promptTitle">Compiled prompt</h2>
            <p>
              Generated from your settings. Not editable by hand, so it can never disagree with the
              gate.
            </p>
          </div>
          <button className="icon-button" type="button" aria-label="Close" onClick={onClose}>
            <Icon name="close" />
          </button>
        </header>
        <pre className="prompt-body">{data?.prompts.reply ?? "Compiling."}</pre>
        <div className="prompt-gate">
          <strong>The validation gate reads the same values</strong>
          <div className="gate-rows">
            {(data?.gateRows ?? []).map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <em>{value}</em>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
