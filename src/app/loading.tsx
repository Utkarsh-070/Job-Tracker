export default function Loading() {
  return (
    <main
      className="loading-state"
      aria-label="Loading your workspace"
      aria-busy="true"
    >
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-tabs" />
      {[0, 1, 2, 3, 4].map((row) => (
        <div className="skeleton skeleton-row" key={row} />
      ))}
      <p role="status">Loading your workspace…</p>
    </main>
  );
}
