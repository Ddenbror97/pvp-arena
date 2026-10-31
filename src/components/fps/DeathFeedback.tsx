export function DeathFeedback({ round }: { round: number }) {
  return (
    <div key={round} className="duel-death-feedback" data-testid="death-feedback">
      <div className="duel-death-blood" aria-hidden />
      <p role="status" className="duel-death-label">
        You were eliminated
      </p>
    </div>
  );
}
