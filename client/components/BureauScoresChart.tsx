import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface BureauScore {
  bureau: string;
  score: number;
  scoreType: string;
  date: string;
  color: string;
}

interface BureauScoresChartProps {
  reportData: any;
  allReports?: any[];
}

const parseChartDate = (value?: string) => {
  if (!value || value === 'N/A') return Number.NaN;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? Number.NaN : timestamp;
};

const BureauScoresChart: React.FC<BureauScoresChartProps> = ({ reportData, allReports = [] }) => {
  // Extract current scores from reportData
  const getCurrentScores = (): BureauScore[] => {
    if (!reportData?.scores) return [];

    return [
      {
        bureau: 'Experian',
        score: parseInt(reportData.scores.experian) || 0,
        scoreType: reportData.scoreTypes?.experian || 'FICO',
        date: reportData.bureauDates?.experian || 'N/A',
        color: '#10B981' // Green
      },
      {
        bureau: 'Equifax', 
        score: parseInt(reportData.scores.equifax) || 0,
        scoreType: reportData.scoreTypes?.equifax || 'FICO',
        date: reportData.bureauDates?.equifax || 'N/A',
        color: '#8B5CF6' // Purple
      },
      {
        bureau: 'TransUnion',
        score: parseInt(reportData.scores.transunion) || 0,
        scoreType: reportData.scoreTypes?.transunion || 'FICO',
        date: reportData.bureauDates?.transunion || 'N/A',
        color: '#3B82F6' // Blue
      }
    ];
  };

  // Extract scores from all reports for comparison
  const getAllReportsScores = (): BureauScore[][] => {
    if (!allReports || allReports.length === 0) return [];

    return allReports.map(report => {
      // The scores are directly under reportData.Score, not reportData.reportData.Score
      const reportContent = report.reportData;

      const scores: BureauScore[] = [];

      // Primary: parse from embedded JSON reportData.Score if available
      if (reportContent?.Score && Array.isArray(reportContent.Score)) {
        reportContent.Score.forEach((scoreData: any) => {
          let bureauName = '';
          let color = '';

          switch (scoreData.BureauId) {
            case 1:
              bureauName = 'TransUnion';
              color = '#3B82F6';
              break;
            case 2:
              bureauName = 'Experian';
              color = '#10B981';
              break;
            case 3:
              bureauName = 'Equifax';
              color = '#8B5CF6';
              break;
            default:
              return;
          }

          scores.push({
            bureau: bureauName,
            score: parseInt(scoreData.Score) || 0,
            scoreType: scoreData.ScoreType || 'FICO',
            date: scoreData.DateScore || scoreData.DateReported || scoreData.DateUpdated || 'N/A',
            color
          });
        });
      } else {
        // Fallback: use DB columns on history rows
        const createdAt = report.created_at || report.date || '';
        const dateStr = createdAt ? new Date(createdAt).toISOString().split('T')[0] : 'N/A';
        const exScore = parseInt(report.experian_score) || 0;
        const eqScore = parseInt(report.equifax_score) || 0;
        const tuScore = parseInt(report.transunion_score) || 0;

        if (exScore > 0) {
          scores.push({
            bureau: 'Experian',
            score: exScore,
            scoreType: 'FICO',
            date: dateStr,
            color: '#10B981'
          });
        }
        if (eqScore > 0) {
          scores.push({
            bureau: 'Equifax',
            score: eqScore,
            scoreType: 'FICO',
            date: dateStr,
            color: '#8B5CF6'
          });
        }
        if (tuScore > 0) {
          scores.push({
            bureau: 'TransUnion',
            score: tuScore,
            scoreType: 'FICO',
            date: dateStr,
            color: '#3B82F6'
          });
        }
      }

      return scores;
    }).sort((left, right) => {
      const leftDate = parseChartDate(left[0]?.date);
      const rightDate = parseChartDate(right[0]?.date);

      if (Number.isNaN(leftDate) && Number.isNaN(rightDate)) return 0;
      if (Number.isNaN(leftDate)) return 1;
      if (Number.isNaN(rightDate)) return -1;

      return leftDate - rightDate;
    });
  };

  const currentScores = getCurrentScores();
  const allReportsScores = getAllReportsScores();

  // Calculate average scores across all reports
  const getAverageScores = (): BureauScore[] => {
    if (allReportsScores.length === 0) return currentScores;

    const bureauTotals: { [key: string]: { total: number; count: number; color: string } } = {};

    // Include current scores
    currentScores.forEach(score => {
      if (!bureauTotals[score.bureau]) {
        bureauTotals[score.bureau] = { total: 0, count: 0, color: score.color };
      }
      bureauTotals[score.bureau].total += score.score;
      bureauTotals[score.bureau].count += 1;
    });

    // Add scores from all reports
    allReportsScores.forEach(reportScores => {
      reportScores.forEach(score => {
        if (!bureauTotals[score.bureau]) {
          bureauTotals[score.bureau] = { total: 0, count: 0, color: score.color };
        }
        bureauTotals[score.bureau].total += score.score;
        bureauTotals[score.bureau].count += 1;
      });
    });

    return Object.entries(bureauTotals).map(([bureau, data]) => ({
      bureau,
      score: Math.round(data.total / data.count),
      scoreType: 'Average',
      date: 'All Reports',
      color: data.color
    }));
  };

  // Prepare data for line chart - showing score trends over time
  const getLineChartData = () => {
    if (allReportsScores.length === 0) {
      // If no historical data, show current scores as single point
      return currentScores.map((score) => ({
        reportIndex: 0,
        date: 'Current',
        [score.bureau.toLowerCase().replace(/\s+/g, '')]: score.score
      }));
    }

    // Create data points for each report
    const lineData: any[] = [];
    
    // Add historical reports
    allReportsScores.forEach((reportScores, index) => {
      const dataPoint: any = {
        reportIndex: index + 1,
        date: reportScores[0]?.date || `Report ${index + 1}`
      };
      
      reportScores.forEach(score => {
        const key = score.bureau.toLowerCase().replace(/\s+/g, '');
        dataPoint[key] = score.score;
      });
      
      lineData.push(dataPoint);
    });

    // Add current report as the latest point
    const currentDataPoint: any = {
      reportIndex: allReportsScores.length + 1,
      date: 'Current'
    };
    
    currentScores.forEach(score => {
      const key = score.bureau.toLowerCase().replace(/\s+/g, '');
      currentDataPoint[key] = score.score;
    });
    
    lineData.push(currentDataPoint);

    return lineData;
  };

  const lineChartData = getLineChartData();
  const allScoreValues = [
    ...currentScores,
    ...allReportsScores.flat()
  ]
    .map(score => score.score)
    .filter(score => score > 0);
  const minScore = allScoreValues.length > 0 ? Math.min(...allScoreValues) : 300;

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
  const averageScores = getAverageScores();

  // Debug logging
  console.log('🔍 BureauScoresChart Debug:');
  console.log('- Current scores:', currentScores);
  console.log('- All reports scores:', allReportsScores);
  console.log('- Line chart data:', lineChartData);
  console.log('- Data length:', lineChartData.length);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800 mb-2">{`${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {`${entry.dataKey}: ${entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const getScoreColor = (score: number): string => {
    if (score >= 750) return '#10B981'; // Green - Excellent
    if (score >= 700) return '#F59E0B'; // Yellow - Good
    if (score >= 650) return '#F97316'; // Orange - Fair
    return '#EF4444'; // Red - Poor
  };

  return (
    <Card className="w-full h-full flex flex-col my-5 mb-5">
      <CardHeader>
        <CardTitle>Bureau Credit Scores Trend</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {/* Line Chart */}
        <div className="h-80 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[minScore, 850]} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="experian" 
                stroke="#8884d8" 
                strokeWidth={2}
                dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="equifax" 
                stroke="#82ca9d" 
                strokeWidth={2}
                dot={{ fill: '#82ca9d', strokeWidth: 2, r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="transunion" 
                stroke="#ffc658" 
                strokeWidth={2}
                dot={{ fill: '#ffc658', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Bureau Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
          {/* Experian */}
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold text-lg mb-2 flex items-center">
              <div className="w-3 h-3 bg-[#8884d8] rounded-full mr-2"></div>
              Experian
            </h3>
            <div className="space-y-1">
              <div className="text-2xl font-bold">
                {currentScores.find(s => s.bureau === 'Experian')?.score || 'N/A'}
              </div>
              <div className="text-sm text-gray-600">
                {currentScores.find(s => s.bureau === 'Experian')?.scoreType || 'N/A'}
              </div>
              <div className="text-xs text-gray-500">
                Avg: {averageScores.find(s => s.bureau === 'Experian')?.score || 'N/A'}
              </div>
            </div>
          </div>

          {/* Equifax */}
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold text-lg mb-2 flex items-center">
              <div className="w-3 h-3 bg-[#82ca9d] rounded-full mr-2"></div>
              Equifax
            </h3>
            <div className="space-y-1">
              <div className="text-2xl font-bold">
                {currentScores.find(s => s.bureau === 'Equifax')?.score || 'N/A'}
              </div>
              <div className="text-sm text-gray-600">
                {currentScores.find(s => s.bureau === 'Equifax')?.scoreType || 'N/A'}
              </div>
              <div className="text-xs text-gray-500">
                Avg: {averageScores.find(s => s.bureau === 'Equifax')?.score || 'N/A'}
              </div>
            </div>
          </div>

          {/* TransUnion */}
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold text-lg mb-2 flex items-center">
              <div className="w-3 h-3 bg-[#ffc658] rounded-full mr-2"></div>
              TransUnion
            </h3>
            <div className="space-y-1">
              <div className="text-2xl font-bold">
                {currentScores.find(s => s.bureau === 'TransUnion')?.score || 'N/A'}
              </div>
              <div className="text-sm text-gray-600">
                {currentScores.find(s => s.bureau === 'TransUnion')?.scoreType || 'N/A'}
              </div>
              <div className="text-xs text-gray-500">
                Avg: {averageScores.find(s => s.bureau === 'TransUnion')?.score || 'N/A'}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BureauScoresChart;
