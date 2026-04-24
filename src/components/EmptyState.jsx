export default function EmptyState({ title, body }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}
