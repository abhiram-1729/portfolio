import React from 'react';

export default function DashboardLoader({ message = "Initializing Control Center...", progress = 0 }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-2 p-6 select-none bg-slate-50/50 rounded-3xl">
      {/* SVG Container */}
      <div className="w-48 h-auto relative drop-shadow-[0_10px_25px_rgba(16,185,129,0.08)]">
        <svg 
          viewBox="0 0 500 300" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto"
        >
          {/* Definitions for animations and styles */}
          <defs>
            <style>{`
              @keyframes spin-wheel {
                0% { transform: rotate(360deg); }
                100% { transform: rotate(0deg); }
              }
              @keyframes truck-bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-2px) rotate(-0.2deg); }
              }
              @keyframes speed-line-top {
                0% { transform: translateX(0) scaleX(1); opacity: 0.3; }
                50% { transform: translateX(10px) scaleX(0.8); opacity: 0.8; }
                100% { transform: translateX(0) scaleX(1); opacity: 0.3; }
              }
              @keyframes speed-line-mid {
                0% { transform: translateX(0) scaleX(1); opacity: 0.4; }
                50% { transform: translateX(18px) scaleX(0.7); opacity: 0.9; }
                100% { transform: translateX(0) scaleX(1); opacity: 0.4; }
              }
              @keyframes speed-line-bot {
                0% { transform: translateX(0) scaleX(1); opacity: 0.2; }
                50% { transform: translateX(8px) scaleX(0.85); opacity: 0.7; }
                100% { transform: translateX(0) scaleX(1); opacity: 0.2; }
              }
              @keyframes road-slide {
                0% { stroke-dashoffset: 0; }
                100% { stroke-dashoffset: -65; }
              }
              /* Animating via native SVG animateTransform for maximum browser compatibility */
              .speed-line-top {
                animation: speed-line-top 9s ease-in-out infinite;
                transform-origin: left center;
              }
              .speed-line-mid {
                animation: speed-line-mid 7s ease-in-out infinite;
                transform-origin: left center;
              }
              .speed-line-bot {
                animation: speed-line-bot 11s ease-in-out infinite;
                transform-origin: left center;
              }
              .road-line {
                stroke-dasharray: 40, 25;
                animation: road-slide 8s linear infinite;
              }
            `}</style>
          </defs>

          {/* Speed Lines (Right side) */}
          <g className="speed-lines" stroke="#10b981" strokeWidth="4.5" strokeLinecap="round">
            <line x1="425" y1="120" x2="455" y2="120" className="speed-line-top" />
            <line x1="425" y1="145" x2="475" y2="145" className="speed-line-mid" strokeWidth="5.5" />
            <line x1="425" y1="170" x2="445" y2="170" className="speed-line-bot" />
            <line x1="425" y1="195" x2="465" y2="195" className="speed-line-mid" />
          </g>

          {/* Entire Truck Group (bounces) */}
          <g className="truck-body">
            <animateTransform 
              attributeName="transform" 
              type="translate" 
              values="0 0; 0 -2.5; 0 0" 
              dur="4.5s" 
              repeatCount="indefinite" 
            />
            {/* Main Truck Body & Cabin */}
            {/* Green Cabin Path */}
            <path 
              d="M175 220 H95 C88 220 83 218 80 212 L73 192 C71 185 71 178 74 172 L93 125 C97 116 106 110 116 110 H175 V220 Z" 
              fill="#10b981" 
            />
            {/* Windshield / Side Window cutout */}
            <path 
              d="M118 122 H163 V172 H108 C106 172 105 170 106 168 L114 126 C115 123 116 122 118 122 Z" 
              fill="white" 
            />
            {/* Inner frame lines/door line inside Cabin */}
            <path 
              d="M140 122 V220" 
              stroke="#10b981" 
              strokeWidth="3.5" 
            />
            <rect x="150" y="185" width="10" height="4.5" rx="2" fill="white" />

            {/* Front Headlight & indicators */}
            <rect x="70" y="195" width="6" height="15" rx="3" fill="#FFE885" />
            <rect x="68" y="172" width="6" height="10" rx="2" fill="white" />
            
            {/* TATA ACE Text on Cabin door */}
            <text 
              x="105" 
              y="193" 
              fill="white" 
              fontFamily="'Inter', sans-serif" 
              fontSize="10" 
              fontWeight="900" 
              letterSpacing="0.5"
            >
              TATA
            </text>
            <text 
              x="105" 
              y="205" 
              fill="white" 
              fontFamily="'Inter', sans-serif" 
              fontSize="10" 
              fontWeight="900" 
              letterSpacing="0.5"
            >
              ACE
            </text>

            {/* Cargo Box (Right) */}
            <rect 
              x="180" 
              y="90" 
              width="230" 
              height="130" 
              rx="14" 
              fill="#10b981" 
            />
            
            {/* Brand Logo inside Cargo Box */}
            <g transform="translate(15, 0)">
              {/* Shopping Bag Icon Handle */}
              <path 
                d="M272 124 C272 114 288 114 288 124" 
                stroke="white" 
                strokeWidth="4" 
                strokeLinecap="round" 
                fill="none" 
              />
              {/* Shopping Bag body */}
              <path 
                d="M260 128 H300 C302 128 304 129 303 131 L299 157 C298 160 295 162 292 162 H268 C265 162 262 160 261 157 L257 131 C256 129 258 128 260 128 Z" 
                fill="none" 
                stroke="white" 
                strokeWidth="4.5"
                strokeLinejoin="round"
              />
              {/* Letter K inside bag */}
              <text 
                x="280" 
                y="151" 
                fill="white" 
                fontFamily="'Inter', 'Outfit', sans-serif" 
                fontSize="18" 
                fontWeight="900"
                textAnchor="middle"
              >
                K
              </text>
              
              {/* VillagKart Brand Name */}
              <text 
                x="280" 
                y="186" 
                textAnchor="middle" 
                fill="white" 
                fontFamily="'Inter', 'Outfit', sans-serif" 
                fontSize="22" 
                fontWeight="900" 
                letterSpacing="-0.5"
              >
                VillagKart
              </text>
            </g>

            {/* Under-chassis black/grey bar */}
            <rect x="90" y="220" width="310" height="8" fill="#047857" />

            {/* Front Wheel Hub / Mudguard */}
            <path d="M110 216 C110 200 142 200 142 216 Z" fill="#047857" />
            {/* Rear Wheel Hub / Mudguard */}
            <path d="M330 216 C330 200 362 200 362 216 Z" fill="#047857" />
          </g>

          {/* Wheels (Separate from body so they can spin on their own center positions) */}
          {/* Left Wheel Center at (126, 230) */}
          <g transform="translate(126, 230)">
            <g>
              <animateTransform 
                attributeName="transform" 
                type="rotate" 
                from="360" 
                to="0" 
                dur="0.5s" 
                repeatCount="indefinite" 
              />
              <circle cx="0" cy="0" r="24" fill="#10b981" />
              <circle cx="0" cy="0" r="18" fill="white" />
              <circle cx="0" cy="0" r="13" fill="#10b981" />
              {/* Spokes for visible rotation */}
              <line x1="0" y1="-14" x2="0" y2="14" stroke="white" strokeWidth="2.5" />
              <line x1="-14" y1="0" x2="14" y2="0" stroke="white" strokeWidth="2.5" />
              <circle cx="0" cy="0" r="6" fill="#10b981" />
              <circle cx="0" cy="0" r="3" fill="white" />
            </g>
          </g>

          {/* Right Wheel Center at (346, 230) */}
          <g transform="translate(346, 230)">
            <g>
              <animateTransform 
                attributeName="transform" 
                type="rotate" 
                from="360" 
                to="0" 
                dur="0.5s" 
                repeatCount="indefinite" 
              />
              <circle cx="0" cy="0" r="24" fill="#10b981" />
              <circle cx="0" cy="0" r="18" fill="white" />
              <circle cx="0" cy="0" r="13" fill="#10b981" />
              {/* Spokes for visible rotation */}
              <line x1="0" y1="-14" x2="0" y2="14" stroke="white" strokeWidth="2.5" />
              <line x1="-14" y1="0" x2="14" y2="0" stroke="white" strokeWidth="2.5" />
              <circle cx="0" cy="0" r="6" fill="#10b981" />
              <circle cx="0" cy="0" r="3" fill="white" />
            </g>
          </g>          {/* Ground / Road line */}
          <line 
            x1="50" 
            y1="255" 
            x2="450" 
            y2="255" 
            stroke="#10b981" 
            strokeWidth="4.5" 
            strokeLinecap="round"
            className="road-line"
          />
        </svg>
      </div>

      {/* Progress Bar (Moved up) */}
      <div className="flex flex-col items-center w-full gap-1 mt-0">
        <div className="h-2 w-48 bg-emerald-100/50 rounded-full overflow-hidden shadow-inner border border-emerald-50/50">
          <div 
            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-300 ease-out" 
            style={{ width: `${progress}%` }} 
          />
        </div>
        <span className="text-[10px] font-black text-emerald-600 tracking-wider">
          {Math.round(progress)}%
        </span>
      </div>

      {/* Loading Message */}
      <div className="flex flex-col items-center text-center mt-1">
        <p className="text-xs text-slate-400 font-extrabold uppercase tracking-[0.25em] animate-pulse">
          {message}
        </p>
      </div>
    </div>
  );
}
