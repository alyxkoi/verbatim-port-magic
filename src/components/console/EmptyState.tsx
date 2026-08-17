// Markup ported verbatim from emptyState() in alyxlab-console.html.
import { Icon } from "./icons";

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-state">
      <div>
        <div className="empty-icon">
          <Icon name="check" />
        </div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </div>
  );
}
