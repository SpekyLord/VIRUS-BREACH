import { useLocation, useNavigate } from 'react-router-dom';

const VIRUS_COLORS = {
  TROJAN:     '#ff0040',
  WORM:       '#00ff41',
  RANSOMWARE: '#ff6600',
  SPYWARE:    '#00d4ff',
  MALWARE:    '#bf00ff',
  BOTNET:     '#ffdd00',
};

const RATING_COLORS = {
  'Digital Fortress':      '#00ff41',
  'Cyber Sentinel':        '#00d4ff',
  'Firewall Apprentice':   '#ffdd00',
  'Needs a Firewall':      '#ff6600',
  'Walking Vulnerability': '#ff0040',
  'Script Kiddie':         '#bf00ff',
};

const RANK_LABELS = ['1ST', '2ND', '3RD'];

function rankLabel(index) {
  return RANK_LABELS[index] || `#${index + 1}`;
}

export default function HostScoreboard() {
  const location = useLocation();
  const navigate = useNavigate();

  const gameOverData = location.state?.gameOverData;
  const fallbackGameState = location.state?.gameState;

  // Build ranked list — prefer gameOverData (has AI summaries), fall back to gameState.teams
  const rankedTeams = gameOverData?.finalScores
    ? gameOverData.finalScores
    : (fallbackGameState?.teams || [])
        .filter(t => t.players?.length > 0)
        .sort((a, b) => (b.points || 0) - (a.points || 0))
        .map(t => ({
          teamId: t.id,
          virusName: t.virusName || t.virus?.name || t.name,
          name: t.name,
          points: t.points || 0,
        }));

  const summaries = gameOverData?.summaries || {};

  const getTeamColor = (teamId, virusName) => {
    // Try fallback game state first
    const team = fallbackGameState?.teams?.find(t => t.id === teamId);
    if (team?.virusColor) return team.virusColor;
    if (team?.virus?.color) return team.virus.color;
    return VIRUS_COLORS[virusName] || '#00ff41';
  };

  // No data — direct URL navigation or state was lost
  if (!rankedTeams || rankedTeams.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <h1 className="text-4xl font-display font-bold text-cyber-green mb-4">GAME OVER</h1>
        <p className="text-cyber-text-dim font-mono mb-8">No game data available.</p>
        <button
          onClick={() => navigate('/host')}
          className="cyber-btn-primary px-8 py-4 text-lg font-display font-bold"
        >
          GO HOME
        </button>
      </div>
    );
  }

  const topScore = rankedTeams[0]?.points || 0;

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-6xl font-display font-bold text-cyber-green mb-2">
            GAME OVER
          </h1>
          <p className="text-cyber-cyan font-mono text-lg">
            Final Standings — Virus Breach
          </p>
        </div>

        {/* Rankings */}
        <div className="space-y-4 mb-10">
          {rankedTeams.map((team, i) => {
            const teamColor = getTeamColor(team.teamId, team.virusName);
            const teamSummary = summaries[team.teamId];
            const ratingColor = teamSummary ? (RATING_COLORS[teamSummary.rating] || '#00ff41') : null;
            const isWinner = team.points === topScore && topScore > 0;

            return (
              <div
                key={team.teamId}
                className="cyber-card p-6"
                style={isWinner && i === 0 ? { boxShadow: `0 0 20px ${teamColor}40` } : {}}
              >
                {/* Row: rank + name + points */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-4">
                    <span
                      className="font-display font-bold text-2xl w-12 text-center"
                      style={{ color: i < 3 ? teamColor : '#666' }}
                    >
                      {rankLabel(i)}
                    </span>
                    <span
                      className="font-display font-bold text-3xl"
                      style={{ color: teamColor }}
                    >
                      {team.virusName}
                    </span>
                    {isWinner && i === 0 && (
                      <span className="text-yellow-400 font-display font-bold text-sm border border-yellow-400 px-2 py-0.5 rounded">
                        CHAMPION
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="font-display font-bold text-4xl text-cyber-green">
                      {team.points}
                    </span>
                    <span className="text-cyber-text-dim font-mono text-sm ml-1">
                      {team.points === 1 ? 'pt' : 'pts'}
                    </span>
                  </div>
                </div>

                {/* AI summary + rating (if available) */}
                {teamSummary && (
                  <div className="border-t border-gray-700 pt-3 mt-3">
                    <p className="text-cyber-text font-mono text-sm italic leading-relaxed mb-3">
                      "{teamSummary.summary}"
                    </p>
                    <span
                      className="inline-block px-3 py-1 border-2 rounded font-display font-bold text-xs"
                      style={{ color: ratingColor, borderColor: ratingColor }}
                    >
                      {teamSummary.rating}
                    </span>
                  </div>
                )}

                {/* No summary available (force-ended game) */}
                {!teamSummary && (
                  <div className="border-t border-gray-700 pt-3 mt-3">
                    <p className="text-cyber-text-dim font-mono text-xs italic">
                      — Game ended before AI could roast this team. Lucky them. —
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Play Again */}
        <div className="text-center">
          <button
            onClick={() => navigate('/host')}
            className="cyber-btn-green px-12 py-5 text-2xl font-display font-bold"
          >
            PLAY AGAIN
          </button>
        </div>

      </div>
    </div>
  );
}
