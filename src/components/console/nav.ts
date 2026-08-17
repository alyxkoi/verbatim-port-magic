// NAV order and SCREEN_META copy ported verbatim from alyxlab-console.html.
export type ConsoleView =
  | "today"
  | "leads"
  | "calendar"
  | "clients"
  | "plans"
  | "links"
  | "blip"
  | "settings";

export const NAV = [
  { id: "today", label: "Today", icon: "today", to: "/console" },
  { id: "leads", label: "Leads", icon: "leads", to: "/console/leads" },
  { id: "calendar", label: "Calendar", icon: "calendar", to: "/console/calendar" },
  { id: "clients", label: "Clients", icon: "clients", to: "/console/clients" },
  { id: "plans", label: "Plans", icon: "plans", to: "/console/plans" },
  { id: "links", label: "Links", icon: "links", to: "/console/links" },
  { id: "blip", label: "Blip", icon: "blip", to: "/console/blip" },
  { id: "settings", label: "Settings", icon: "settings", to: "/console/settings" },
] as const satisfies ReadonlyArray<{
  id: ConsoleView;
  label: string;
  icon: string;
  to: string;
}>;

export const SCREEN_META: Record<ConsoleView, [string, string]> = {
  today: ["Today", "The work that needs a human, first."],
  leads: ["Leads", "Recent activity, not a sales pipeline."],
  calendar: ["Calendar", "Calls, availability, and the time you protect."],
  clients: ["Clients", "Who you are running, and what they are using."],
  plans: ["Plans", "Edit the words. Trust the pricing logic."],
  links: ["Links", "Know what creates action, not just clicks."],
  blip: ["Blip", "The voice that answers before you do."],
  settings: ["Settings", "Automation rules you can change without a deploy."],
};

export type Daypart = "morning" | "afternoon" | "evening" | "night";

export function daypartForNow(now = new Date()): Daypart {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 20) return "evening";
  return "night";
}

export function greetingForDaypart(daypart: Daypart): string {
  if (daypart === "morning") return "Good morning";
  if (daypart === "afternoon") return "Good afternoon";
  if (daypart === "night") return "Good night";
  return "Good evening";
}

export function viewFromPathname(pathname: string): ConsoleView {
  const match = NAV.find((item) => item.to !== "/console" && pathname.startsWith(item.to));
  return (match?.id ?? "today") as ConsoleView;
}
