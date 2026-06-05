import React from 'react';

interface CreditFactor {
  label: string;
  value: number;
  color: string;
}

interface CircularScoreChartProps {
  score: number;
  scoreType: 'FICO' | 'VantageScore';
  creditFactors?: CreditFactor[];
  size?: number;
}

const CircularScoreChart: React.FC<CircularScoreChartProps> = ({ 
  score, 
  scoreType, 
  creditFactors,
  size = 320 
}) => {
  const radius = (size - 80) / 2;
  const center = size / 2;
  const strokeWidth = 40;
  const labelRadiusOffset = Math.max(18, Math.min(45, size * 0.12));
  const labelBoxClasses = size < 260
    ? 'bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 shadow-lg border border-gray-200 text-center min-w-[60px]'
    : 'bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-gray-200 text-center min-w-[80px]';
  const labelValueClasses = size < 260 ? 'text-base font-bold text-gray-900 leading-none' : 'text-lg font-bold text-gray-900 leading-none';
  const labelTextClasses = size < 260 ? 'text-[10px] text-gray-600 font-medium mt-1 leading-tight' : 'text-xs text-gray-600 font-medium mt-1 leading-tight';
  const scoreClasses = size < 260 ? 'text-2xl font-black text-transparent bg-gradient-to-br from-gray-800 via-gray-900 to-black bg-clip-text hover:scale-105 transition-transform duration-300 cursor-default' : 'text-3xl font-black text-transparent bg-gradient-to-br from-gray-800 via-gray-900 to-black bg-clip-text hover:scale-105 transition-transform duration-300 cursor-default';
  const ficoLogoClasses = size < 260 ? 'h-14 w-auto mb-2 object-contain filter drop-shadow-md hover:scale-110 transition-transform duration-300' : 'h-20 w-auto mb-2 object-contain filter drop-shadow-md hover:scale-110 transition-transform duration-300';
  const vantageLogoClasses = size < 260 ? 'h-16 w-auto mb-1 object-contain filter drop-shadow-md hover:scale-110 transition-transform duration-300' : 'h-22 w-auto mb-1 object-contain filter drop-shadow-md hover:scale-110 transition-transform duration-300';
  const badgeClasses = size < 260 ? 'text-[10px] text-gray-500 font-semibold tracking-wide bg-gray-100 px-2 py-1 rounded-full' : 'text-xs text-gray-500 font-semibold tracking-wide bg-gray-100 px-3 py-1 rounded-full';
  const centerSize = size < 260 ? size * 0.42 : size * 0.48;
  const centerBoxClasses = size < 260
    ? 'text-center bg-gradient-to-br from-white via-gray-50 to-white rounded-full p-3 shadow-2xl border-4 border-white ring-4 ring-gray-100 ring-opacity-50 backdrop-blur-sm flex flex-col items-center justify-center gap-1'
    : 'text-center bg-gradient-to-br from-white via-gray-50 to-white rounded-full p-5 shadow-2xl border-4 border-white ring-4 ring-gray-100 ring-opacity-50 backdrop-blur-sm flex flex-col items-center justify-center gap-2';
  const scoreLabelClasses = size < 260 ? 'text-[10px] text-gray-600 uppercase tracking-widest font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent' : 'text-xs text-gray-600 uppercase tracking-widest font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent';
  const logoWrapperClasses = size < 260 ? 'mb-1 flex flex-col items-center' : 'mb-2 flex flex-col items-center';
  
  // Score breakdown data - use provided creditFactors or fallback to defaults
  const getScoreBreakdown = (): CreditFactor[] => {
    if (creditFactors && creditFactors.length > 0) {
      return creditFactors;
    }

    // Fallback to default values if no creditFactors provided
    if (scoreType === 'FICO') {
      return [
        { label: 'Payment History', value: 35, color: '#1E40AF' },
        { label: 'Amounts Owed', value: 30, color: '#0EA5E9' },
        { label: 'Length of Credit History', value: 15, color: '#84CC16' },
        { label: 'Credit Mix', value: 10, color: '#F97316' },
        { label: 'New Credit', value: 10, color: '#6B7280' }
      ];
    } else {
      return [
        { label: 'Payment History', value: 40, color: '#047857' },
        { label: 'Age and Type of Credit', value: 21, color: '#0EA5E9' },
        { label: 'Credit Utilization', value: 20, color: '#CA8A04' },
        { label: 'Balances', value: 11, color: '#7C3AED' },
        { label: 'Recent Credit', value: 5, color: '#DC2626' }
      ];
    }
  };

  const breakdown = getScoreBreakdown();

  // Calculate pie chart segments
  const createPieSegments = () => {
    let cumulativePercentage = 0;
    
    return breakdown.map((item, index) => {
      const startAngle = (cumulativePercentage / 100) * 360;
      const endAngle = ((cumulativePercentage + item.value) / 100) * 360;
      cumulativePercentage += item.value;

      // Convert angles to radians
      const startAngleRad = (startAngle - 90) * (Math.PI / 180);
      const endAngleRad = (endAngle - 90) * (Math.PI / 180);

      // Calculate arc path
      const largeArcFlag = item.value > 50 ? 1 : 0;
      
      const x1 = center + radius * Math.cos(startAngleRad);
      const y1 = center + radius * Math.sin(startAngleRad);
      const x2 = center + radius * Math.cos(endAngleRad);
      const y2 = center + radius * Math.sin(endAngleRad);

      const pathData = [
        `M ${center} ${center}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        'Z'
      ].join(' ');

      return {
        ...item,
        pathData,
        startAngle,
        endAngle
      };
    });
  };

  const segments = createPieSegments();

  return (
    <div className="flex flex-col items-center">
      {/* Circular Chart */}
      <div className="relative drop-shadow-2xl" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="filter drop-shadow-lg">
          {/* Background circle for depth */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius + 8}
            fill="url(#backgroundGradient)"
            className="opacity-20"
          />
          
          {/* Pie chart segments */}
          {segments.map((segment, index) => (
            <g key={index}>
              {/* Shadow layer */}
              <path
                d={segment.pathData}
                fill="rgba(0,0,0,0.1)"
                transform="translate(2,2)"
                className="opacity-50"
              />
              {/* Main segment with gradient */}
              <path
                d={segment.pathData}
                fill={`url(#gradient${index})`}
                stroke="white"
                strokeWidth="3"
                className="transition-all duration-500 hover:scale-105 hover:brightness-110 cursor-pointer"
                style={{ transformOrigin: `${size/2}px ${size/2}px` }}
              />
              {/* Highlight overlay */}
              <path
                d={segment.pathData}
                fill="url(#highlightGradient)"
                className="opacity-0 hover:opacity-30 transition-opacity duration-300"
              />
            </g>
          ))}
          
          {/* Gradient definitions */}
          <defs>
            <radialGradient id="backgroundGradient" cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.8)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.1)" />
            </radialGradient>
            
            <radialGradient id="highlightGradient" cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.8)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>
            
            {segments.map((segment, index) => (
              <radialGradient key={index} id={`gradient${index}`} cx="50%" cy="30%" r="70%">
                <stop offset="0%" stopColor={segment.color} stopOpacity="0.9" />
                <stop offset="70%" stopColor={segment.color} stopOpacity="1" />
                <stop offset="100%" stopColor={segment.color} stopOpacity="0.8" />
              </radialGradient>
            ))}
          </defs>
        </svg>
        
        {/* Floating labels around the chart */}
        {segments.map((segment, index) => {
          const midAngle = (segment.startAngle + segment.endAngle) / 2;
          const labelRadius = radius + labelRadiusOffset;
          const midAngleRad = (midAngle - 90) * (Math.PI / 180);
          const labelX = center + labelRadius * Math.cos(midAngleRad);
          const labelY = center + labelRadius * Math.sin(midAngleRad);
          
          return (
            <div
              key={`label-${index}`}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{
                left: labelX,
                top: labelY,
              }}
            >
                      <div className={`${labelBoxClasses} hover:bg-white hover:shadow-xl transition-all duration-300`}>
                        <div className={labelValueClasses}>
                  {segment.value}%
                </div>
                        <div className={labelTextClasses}>
                  {segment.label}
                </div>
              </div>
            </div>
          );
        })}
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={centerBoxClasses} style={{ width: centerSize, height: centerSize }}>
            {scoreType === 'FICO' ? (
              <div className={logoWrapperClasses}>
                <div className="relative">
                          <img 
                    src="/FICO_Score_RGB_Blue.png" 
                    alt="FICO Score" 
                            className={ficoLogoClasses}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white opacity-20 rounded-lg"></div>
                </div>
                <div className={scoreLabelClasses}>SCORE</div>
              </div>
            ) : (
              <div className={logoWrapperClasses}>
                <div className="relative">
                          <img 
                    src="/VantageScore.png" 
                    alt="VantageScore" 
                            className={vantageLogoClasses}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white opacity-20 rounded-lg"></div>
                </div>
              </div>
            )}
                    <div className={scoreClasses}>
              {score}
            </div>
                    <div className={badgeClasses}>Avarage Score</div>
          </div>
        </div>

        
      </div>

      {/* Score breakdown legend */}
      <div className="mt-8 w-full">
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border border-gray-200 p-4 sm:p-6">
          <h4 className="text-base sm:text-lg font-bold text-gray-800 mb-4 sm:mb-6 text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Credit Factors Breakdown
          </h4>
          <div className="flex flex-col gap-3 sm:gap-4">
            {breakdown.map((item, index) => (
              <div key={index} className="group relative bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-300 transform hover:-translate-y-1 min-w-0">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="relative">
                      <div 
                        className="w-5 h-5 rounded-full shadow-md border-2 border-white ring-2 ring-gray-100 group-hover:ring-gray-200 transition-all duration-300" 
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <div 
                        className="absolute inset-0 w-5 h-5 rounded-full opacity-20 animate-pulse" 
                        style={{ backgroundColor: item.color }}
                      ></div>
                    </div>
                    <span className="text-gray-700 font-semibold text-xs sm:text-sm leading-snug group-hover:text-gray-900 transition-colors break-words">
                      {item.label}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 sm:shrink-0 sm:pt-0 pt-1">
                    <span className="font-bold text-gray-900 text-lg sm:text-xl group-hover:text-2xl transition-all duration-300">
                      {item.value}
                    </span>
                    <span className="text-gray-500 text-xs sm:text-sm font-medium">%</span>
                  </div>
                </div>
                <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ 
                      backgroundColor: item.color, 
                      width: `${item.value}%`,
                      boxShadow: `0 0 10px ${item.color}40`
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CircularScoreChart;
