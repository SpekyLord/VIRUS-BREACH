export default function ScenarioCard({ text, difficulty, roundNumber }) {
  const difficultyColors = {
    EASY: 'text-cyber-green border-cyber-green',
    MEDIUM: 'text-cyber-yellow border-cyber-yellow',
    HARD: 'text-cyber-red border-cyber-red',
  };

  return (
    <div className="cyber-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-display font-bold text-cyber-cyan">
          ROUND {roundNumber}
        </h2>
        <span className={`px-3 py-1 border-2 rounded font-display text-sm font-bold ${difficultyColors[difficulty]}`}>
          {difficulty}
        </span>
      </div>

      {/* Scenario text */}
      <p className="text-cyber-text text-lg leading-relaxed font-mono">
        {text}
      </p>
    </div>
  );
}
