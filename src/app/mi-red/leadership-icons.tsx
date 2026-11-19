export function StartLineIcon() {
  return <svg className="gm-start-icon" viewBox="0.5 4 23 18.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M1.5 20.6H16" strokeWidth="1.4" opacity="0.4" />
    <path className="gm-track" d="M17 20.6H23" strokeWidth="1.4" opacity="0.7" />
    <g className="gm-runner">
      <circle cx="15" cy="7.6" r="1.9" fill="currentColor" stroke="none" />
      <path d="M7.5 12.4 13 10M13 10.2 14 19.6M7.5 12.4 11 15.6 9.4 19.6M7.5 12.4 4.4 15.4 2.6 19.4" />
    </g>
  </svg>;
}

export function LeadershipClimbIcon() {
  const steps = [
    { x: 6, y: 56, h: 16 },
    { x: 27, y: 44, h: 28 },
    { x: 48, y: 32, h: 40 },
    { x: 69, y: 20, h: 52 },
  ];

  return <svg className="gm-climb-icon" viewBox="0 0 96 76" aria-hidden="true">
    <defs><linearGradient id="gm-climb-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#efbe68" stopOpacity="0.55" /><stop offset="1" stopColor="#d6a342" stopOpacity="0.12" /></linearGradient></defs>
    {steps.map((step) => <rect key={`base-${step.x}`} className="gm-step" x={step.x} y={step.y} width="20" height={step.h} rx="3" />)}
    {steps.map((step, index) => <rect key={`lit-${step.x}`} className="gm-lit" style={{ animationDelay: `${index * 0.45}s` }} fill="url(#gm-climb-fill)" x={step.x} y={step.y} width="20" height={step.h} rx="3" />)}
    <path className="gm-path" d="M8 56H27V44H48V32H69V20H86" />
    <path className="gm-goal" d="M76 5h6l3 4-6 7-6-7z" fill="#efbe68" stroke="#f5eee3" strokeWidth="0.8" strokeLinejoin="round" />
  </svg>;
}
