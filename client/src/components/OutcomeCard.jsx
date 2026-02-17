import TypewriterText from './TypewriterText';

export default function OutcomeCard({ teamName, teamColor, outcomeText, rating }) {
  const ratingConfig = {
    good: { label: 'EFFECTIVE', color: '#00ff41' },
    partial: { label: 'PARTIAL', color: '#ffdd00' },
    bad: { label: 'INEFFECTIVE', color: '#ff0040' },
  };

  const ratingInfo = ratingConfig[rating] || ratingConfig.partial;

  return (
    <div className="cyber-card p-4 mb-4 animate-slide-in-left">
      {/* Team header with color */}
      <div className="flex items-center justify-between mb-3">
        <h3
          className="text-xl font-display font-bold"
          style={{ color: teamColor }}
        >
          {teamName}
        </h3>
        <span
          className="px-3 py-1 border-2 rounded text-sm font-display font-bold"
          style={{ color: ratingInfo.color, borderColor: ratingInfo.color }}
        >
          {ratingInfo.label}
        </span>
      </div>

      {/* Outcome text with typewriter */}
      <p className="text-cyber-text font-mono text-base leading-relaxed">
        <TypewriterText text={outcomeText} speed={30} />
      </p>
    </div>
  );
}
