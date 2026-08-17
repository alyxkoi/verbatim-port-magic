// Leads screen. Markup ported from renderLeads()/renderLeadRow() in
// alyxlab-console.html.
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";

import { Icon } from "@/components/console/icons";
import { LeadDrawer } from "@/components/console/LeadDrawer";
import {
  LEAD_FILTERS,
  STATUS_MAP,
  leadMatchesFilter,
  leadSortPriority,
} from "@/lib/lead-status";
import { listLeads } from "@/lib/leads.functions";

export const Route = createFileRoute("/_authenticated/console/leads")({
  component: LeadsScreen,
});

function activityLabel(time: string) {
  const match = /^(\d+)([mhd])$/.exec(time);
  if (!match) return time;
  const value = Number(match[1]);
  const unit = match[2] === "m" ? "minute" : match[2] === "h" ? "hour" : "day";
  return `${value} ${unit}${value === 1 ? "" : "s"} ago`;
}

function LeadsScreen() {
  const fetchLeads = useServerFn(listLeads);
  const { data } = useQuery({
    queryKey: ["console", "leads"],
    queryFn: () => fetchLeads(),
  });

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("recent");
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);

  const leads = data?.leads ?? [];
  const pillarSpecs = data?.pillarSpecs ?? [];

  const searchable = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return leads;
    return leads.filter((lead) =>
      `${lead.business} ${lead.contact} ${lead.preview} ${lead.source} ${
        STATUS_MAP[lead.displayStatus]?.[0] ?? ""
      }`
        .toLowerCase()
        .includes(query),
    );
  }, [leads, search]);

  const rows = useMemo(() => {
    const matching = searchable.filter((lead) => leadMatchesFilter(lead.displayStatus, filter));
    const ordered = [...matching];
    if (sort === "name") ordered.sort((a, b) => a.business.localeCompare(b.business));
    else if (sort === "attention")
      ordered.sort(
        (a, b) =>
          leadSortPriority(a.displayStatus) - leadSortPriority(b.displayStatus) ||
          b.updatedIso.localeCompare(a.updatedIso),
      );
    else ordered.sort((a, b) => b.updatedIso.localeCompare(a.updatedIso));
    return ordered;
  }, [searchable, filter, sort]);

  const resultCopy =
    rows.length === searchable.length
      ? `${rows.length} lead${rows.length === 1 ? "" : "s"}`
      : `${rows.length} of ${searchable.length} leads`;

  return (
    <>
      <section className="screen" aria-label="Leads">
        <div className="toolbar leads-toolbar">
          <div className="leads-toolbar-top">
            <div className="search-wrap">
              <label className="sr-only" htmlFor="leadSearch">
                Search leads
              </label>
              <Icon name="search" />
              <input
                className="input"
                id="leadSearch"
                type="search"
                placeholder="Search leads"
                value={search}
                autoComplete="off"
                onChange={(event) => setSearch(event.target.value)}
              />
              {search ? (
                <button
                  className="lead-search-clear"
                  type="button"
                  aria-label="Clear lead search"
                  onClick={() => setSearch("")}
                >
                  <Icon name="close" />
                </button>
              ) : null}
            </div>
            <div className="lead-list-controls">
              <span className="lead-result-count" aria-live="polite">
                {resultCopy}
              </span>
              <label className="lead-sort-control">
                <span>Sort</span>
                <select
                  className="select"
                  id="leadSort"
                  aria-label="Sort leads"
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                >
                  <option value="recent">Recent activity</option>
                  <option value="attention">Needs attention</option>
                  <option value="name">Business name</option>
                </select>
              </label>
            </div>
          </div>
          <div className="filter-bar lead-filter-bar" aria-label="Lead views">
            {LEAD_FILTERS.map(([id, label]) => (
              <button
                className={`filter-chip ${filter === id ? "is-active" : ""}`}
                type="button"
                key={id}
                aria-pressed={filter === id}
                onClick={() => setFilter(id)}
              >
                <span>{label}</span>
                <span className="filter-count">
                  {searchable.filter((lead) => leadMatchesFilter(lead.displayStatus, id)).length}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="surface leads-card leads-table">
          {rows.length ? (
            <>
              <div className="lead-list-head" aria-label="Lead list columns">
                <span className="head-lead">Lead</span>
                <span>Latest activity</span>
                <span className="head-source">Source</span>
                <span>Status</span>
                <span className="head-updated">Updated</span>
                <span aria-hidden="true"></span>
              </div>
              {rows.map((lead) => {
                const [statusLabel, statusTone] =
                  STATUS_MAP[lead.displayStatus] ?? [lead.displayStatus, "muted"];
                const selected = activeLeadId === lead.id;
                return (
                  <div className={`lead-row ${selected ? "is-selected" : ""}`} key={lead.id}>
                    <button
                      className="lead-row-hit"
                      type="button"
                      aria-haspopup="dialog"
                      aria-expanded={selected}
                      aria-label={`Open ${lead.business}, ${lead.contact}. ${statusLabel}. ${activityLabel(
                        lead.time,
                      )}. ${lead.preview}`}
                      onClick={() => setActiveLeadId(lead.id)}
                    ></button>
                    <span className="lead-person">
                      <span className="avatar">{lead.initials}</span>
                      <span className="lead-identity">
                        <strong>{lead.business}</strong>
                        <span>{lead.contact}</span>
                      </span>
                    </span>
                    <span className="lead-preview">{lead.preview}</span>
                    <span className="lead-source">{lead.source}</span>
                    <span className="status" data-tone={statusTone}>
                      {statusLabel}
                    </span>
                    <span className="lead-time">{lead.time}</span>
                    <span className="lead-open-arrow" aria-hidden="true">
                      <Icon name="arrow" />
                    </span>
                  </div>
                );
              })}
            </>
          ) : (
            <div className="lead-empty-state">
              <div>
                <div className="lead-empty-icon">
                  <Icon name={search || filter !== "all" ? "search" : "leads"} />
                </div>
                {search || filter !== "all" ? (
                  <>
                    <h3>
                      {search.trim()
                        ? `No leads match \u201c${search.trim()}\u201d`
                        : `No leads in ${
                            LEAD_FILTERS.find(([id]) => id === filter)?.[1] ?? "this view"
                          }`}
                    </h3>
                    <p>Clear the search and filters to return to the full activity list.</p>
                    <button
                      className="button lead-primary-action"
                      type="button"
                      onClick={() => {
                        setSearch("");
                        setFilter("all");
                      }}
                    >
                      Clear search and filters
                    </button>
                  </>
                ) : (
                  <>
                    <h3>Your first lead will land here</h3>
                    <p>
                      Create or share a tracked link. New conversations will arrive here ready to
                      review.
                    </p>
                    <Link className="button lead-primary-action" to="/console/links">
                      Open Links
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {activeLeadId ? (
        <LeadDrawer
          leadId={activeLeadId}
          pillarSpecs={pillarSpecs}
          onClose={() => setActiveLeadId(null)}
        />
      ) : null}
    </>
  );
}
