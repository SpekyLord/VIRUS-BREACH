import { useTimer } from '../hooks/useTimer';

export default function Timer({ timerEndsAt, timerDuration = 60, size = 120 }) {
  const { secondsLeft, percentage } = useTimer(timerEndsAt, timerDuration);

  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  // Color logic
  let strokeColor = '#00ff41';  // green
  if (secondsLeft <= 30 && secondsLeft > 10) strokeColor = '#ffdd00';  // yellow
  if (secondsLeft <= 10) strokeColor = '#ff0040';  // red

  return (
    <div className={`relative ${secondsLeft <= 10 ? 'animate-pulse' : ''}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="8"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={strokeColor}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-100"
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-3xl font-display font-bold" style={{ color: strokeColor }}>
          {secondsLeft}s
        </span>
      </div>
    </div>
  );
}
