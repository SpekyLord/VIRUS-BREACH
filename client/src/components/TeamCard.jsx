export default function TeamCard({ team }) {
  const typists = team.players.filter(p => p.role === 'typist');

  return (
    <div className="cyber-card p-4">
      <div
        className="font-display text-xl font-bold mb-3 pb-2 border-b-2"
        style={{
          color: team.virus.color,
          borderColor: team.virus.color
        }}
      >
        {team.virus.name}
      </div>
      <div className="text-cyber-text text-sm">
        {typists.length === 0 ? (
          <div className="text-cyber-text-dim italic">No players assigned</div>
        ) : (
          <ul className="space-y-1">
            {typists.map(player => (
              <li key={player.socketId} className="flex items-center gap-2">
                <span className="text-cyber-green">▸</span>
                <span>{player.name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
