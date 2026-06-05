import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import CircularScoreChart from './CircularScoreChart';
import { calculateCreditFactors } from '../utils/creditFactorsCalculator';

type CreditFactorAccounts = Parameters<typeof calculateCreditFactors>[0];

interface BureauScore {
  bureau: string;
  score: number;
  scoreType: string;
  date: string;
  color: string;
}

interface ScoreChartsCardProps {
  currentScores: BureauScore[];
  accounts?: CreditFactorAccounts;
  preferredScoreType?: 'FICO' | 'VantageScore';
}

const ScoreChartsCard: React.FC<ScoreChartsCardProps> = ({ currentScores, accounts, preferredScoreType }) => {
  // Get unique score types from current scores for circular charts
  const getUniqueScoreTypes = (): Array<{scoreType: 'FICO' | 'VantageScore', score: number}> => {
    const scoreTypes = new Set<string>();
    const uniqueScores: Array<{scoreType: 'FICO' | 'VantageScore', score: number}> = [];
    
    currentScores.forEach(score => {
      const normalizedType = score.scoreType.toLowerCase().includes('vantage') ? 'VantageScore' : 'FICO';
      if (!scoreTypes.has(normalizedType)) {
        scoreTypes.add(normalizedType);
        uniqueScores.push({
          scoreType: normalizedType as 'FICO' | 'VantageScore',
          score: score.score
        });
      }
    });
    
    // If no scores found, default to FICO with average score
    if (uniqueScores.length === 0 && currentScores.length > 0) {
      const avgScore = Math.round(currentScores.reduce((sum, s) => sum + s.score, 0) / currentScores.length);
      uniqueScores.push({ scoreType: 'FICO', score: avgScore });
    }
    
    return uniqueScores;
  };

  const uniqueScoreTypes = getUniqueScoreTypes();
  const filteredScoreTypes = preferredScoreType
    ? uniqueScoreTypes.filter((entry) => entry.scoreType === preferredScoreType)
    : uniqueScoreTypes;
  const displayScoreTypes = filteredScoreTypes.length > 0 ? filteredScoreTypes : uniqueScoreTypes;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [chartSize, setChartSize] = useState(280);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const updateSize = () => {
      const width = element.clientWidth;
      if (!width) {
        return;
      }
      const nextSize = Math.max(220, Math.min(360, Math.floor(width - 32)));
      setChartSize((prev) => (prev === nextSize ? prev : nextSize));
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <Card className="w-full h-full flex flex-col my-5">
      <CardHeader>
        <CardTitle>Credit Score Analysis</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div ref={containerRef} className="flex flex-col gap-6 flex-1 justify-center w-full">
          {displayScoreTypes.map((scoreData, index) => {
            const factors = accounts ? calculateCreditFactors(accounts, scoreData.scoreType) : undefined;
            return (
              <CircularScoreChart
                key={`${scoreData.scoreType}-${index}`}
                score={scoreData.score}
                scoreType={scoreData.scoreType}
                size={chartSize}
                creditFactors={factors}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default ScoreChartsCard;
