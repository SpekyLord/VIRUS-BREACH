import TypewriterText from './TypewriterText';

export default function VirusTaunt({ teamName, teamColor, tauntText }) {
  return (
    <div
      className="relative border-2 rounded-lg p-3 mb-3"
      style={{ borderColor: teamColor }}
    >
      {/* Team label */}
      <div
        className="absolute -top-3 left-4 px-2 bg-cyber-black font-display text-sm font-bold"
        style={{ color: teamColor }}
      >
        {teamName}
      </div>

      {/* Taunt text */}
      <p className="text-cyber-text font-mono text-sm italic">
        <TypewriterText text={tauntText} speed={25} />
      </p>
    </div>
  );
}
