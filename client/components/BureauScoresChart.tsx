import React from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from './ui/chart';

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

const BUREAU_SERIES = [
  {
    id: 2,
    bureau: 'Experian',
    key: 'experian',
    color: '#8B5CF6',
    tintClassName: 'from-violet-500/20 via-fuchsia-500/10 to-transparent',
  },
  {
    id: 3,
    bureau: 'Equifax',
    key: 'equifax',
    color: '#F472B6',
    tintClassName: 'from-pink-500/20 via-rose-500/10 to-transparent',
  },
  {
    id: 1,
    bureau: 'TransUnion',
    key: 'transunion',
    color: '#22D3EE',
    tintClassName: 'from-cyan-500/20 via-sky-500/10 to-transparent',
  },
] as const;

const formatAxisDate = (value?: string) => {
  if (!value || value === 'N/A') return 'Unknown';
  if (value === 'Current') return 'Current';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(parsed);
};

const formatTooltipDate = (value?: string) => {
  if (!value || value === 'N/A') return 'Unknown report date';
  if (value === 'Current') return 'Current report';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed);
};

const findSeriesById = (bureauId: unknown) =>
  BUREAU_SERIES.find((series) => series.id === Number(bureauId));

const findSeriesByName = (bureauName: unknown) => {
  const normalized = String(bureauName || '')
    .toLowerCase()
    .replace(/\s+/g, '');

  return BUREAU_SERIES.find(
    (series) =>
      series.key === normalized ||
      series.bureau.toLowerCase().replace(/\s+/g, '') === normalized,
  );
};

const renderGlowDot = (color: string) => {
  return ({ cx, cy, value }: any) => {
    if (
      typeof cx !== 'number' ||
      typeof cy !== 'number' ||
      typeof value !== 'number' ||
      Number.isNaN(value)
    ) {
      return null;
    }

    return (
      <g>
        <circle cx={cx} cy={cy} r={12} fill={color} fillOpacity={0.14} />
        <circle cx={cx} cy={cy} r={5.5} fill="hsl(var(--background))" stroke={color} strokeWidth={2.5} />
        <circle cx={cx} cy={cy} r={2.5} fill={color} />
      </g>
    );
  };
};

const renderActiveGlowDot = (color: string) => {
  return ({ cx, cy, value }: any) => {
    if (
      typeof cx !== 'number' ||
      typeof cy !== 'number' ||
      typeof value !== 'number' ||
      Number.isNaN(value)
    ) {
      return null;
    }

    return (
      <g>
        <circle cx={cx} cy={cy} r={16} fill={color} fillOpacity={0.18} />
        <circle cx={cx} cy={cy} r={7} fill="hsl(var(--background))" stroke={color} strokeWidth={3} />
        <circle cx={cx} cy={cy} r={3} fill={color} />
      </g>
    );
  };
};

const parseChartDate = (value?: string) => {
  if (!value || value === 'N/A') return Number.NaN;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? Number.NaN : timestamp;
};

const BureauScoresChart: React.FC<BureauScoresChartProps> = ({ reportData, allReports = [] }) => {
  const chartId = React.useId().replace(/:/g, '');

  // Extract current scores from reportData
  const getCurrentScores = (): BureauScore[] => {
    const scoreRows = Array.isArray(reportData?.Score)
      ? reportData.Score
      : Array.isArray(reportData?.Scores)
      ? reportData.Scores
      : [];

    if (scoreRows.length > 0) {
      return scoreRows
        .map((scoreData: any) => {
          if (!scoreData || typeof scoreData !== 'object') {
            return null;
          }

          const series = findSeriesById(scoreData.BureauId) || findSeriesByName(scoreData.Bureau);
          if (!series) {
            return null;
          }

          const score = parseInt(scoreData.Score) || 0;
          if (score <= 0) {
            return null;
          }

          return {
            bureau: series.bureau,
            score,
            scoreType: scoreData.ScoreType || 'FICO',
            date: scoreData.DateScore || scoreData.DateReported || scoreData.DateUpdated || 'N/A',
            color: series.color,
          };
        })
        .filter(Boolean) as BureauScore[];
    }

    if (!reportData?.scores) return [];

    return BUREAU_SERIES.map((series) => {
      const score = parseInt(reportData.scores?.[series.key]) || 0;
      if (score <= 0) {
        return null;
      }

      return {
        bureau: series.bureau,
        score,
        scoreType: reportData.scoreTypes?.[series.key] || 'FICO',
        date: reportData.bureauDates?.[series.key] || 'N/A',
        color: series.color,
      };
    }).filter(Boolean) as BureauScore[];
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
          const series = findSeriesById(scoreData.BureauId) || findSeriesByName(scoreData.Bureau);

          if (!series) {
            return;
          }

          const score = parseInt(scoreData.Score) || 0;
          if (score <= 0) {
            return;
          }

          scores.push({
            bureau: series.bureau,
            score,
            scoreType: scoreData.ScoreType || 'FICO',
            date: scoreData.DateScore || scoreData.DateReported || scoreData.DateUpdated || 'N/A',
            color: series.color
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
            color: '#8B5CF6'
          });
        }
        if (eqScore > 0) {
          scores.push({
            bureau: 'Equifax',
            score: eqScore,
            scoreType: 'FICO',
            date: dateStr,
            color: '#F472B6'
          });
        }
        if (tuScore > 0) {
          scores.push({
            bureau: 'TransUnion',
            score: tuScore,
            scoreType: 'FICO',
            date: dateStr,
            color: '#22D3EE'
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
      const currentPoint: any = {
        reportIndex: 1,
        date: 'Current',
      };

      currentScores.forEach((score) => {
        currentPoint[score.bureau.toLowerCase().replace(/\s+/g, '')] = score.score;
      });

      return [currentPoint];
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
  const yAxisMin = Math.max(300, Math.floor((minScore - 30) / 25) * 25);
  const averageScores = getAverageScores();
  const chartConfig = BUREAU_SERIES.reduce((config, series) => {
    config[series.key] = {
      label: series.bureau,
      color: series.color,
    };
    return config;
  }, {} as Record<string, { label: string; color: string }>);

  return (
    <Card className="relative isolate my-5 flex h-full w-full flex-col overflow-hidden border-0 bg-background shadow-xl shadow-sky-500/5 ring-1 ring-slate-200/70 dark:ring-slate-800/70">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-cyan-400 via-violet-400 to-pink-400 opacity-80" />
      <div className="absolute -left-16 top-16 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="absolute right-0 top-8 h-48 w-48 rounded-full bg-violet-400/10 blur-3xl" />
      <CardHeader className="relative space-y-4 pb-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Score Movement
            </CardDescription>
            <CardTitle className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Bureau Credit Scores Trend
            </CardTitle>
            <p className="max-w-2xl text-sm text-muted-foreground">
              A cleaner read of how each bureau score has moved over time, with the latest report highlighted in the same visual language as the Stripe analytics dashboard.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {BUREAU_SERIES.map((series) => (
              <div
                key={series.key}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/85 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-200"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor: series.color,
                    boxShadow: `0 0 0 4px ${series.color}22`,
                  }}
                />
                {series.bureau}
              </div>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative flex flex-1 flex-col gap-6 pt-2">
        <div className="rounded-[28px] border border-slate-200/70 bg-white/85 p-4 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.42)] dark:border-slate-800 dark:bg-slate-950/45">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 px-1 pb-4 dark:border-slate-800">
            <div>
              <div className="text-sm font-semibold text-foreground">Historical trendline</div>
              <div className="text-xs text-muted-foreground">
                {lineChartData.length} snapshot{lineChartData.length === 1 ? '' : 's'} available
              </div>
            </div>
            <div className="rounded-full border border-slate-200/80 bg-slate-50/80 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
              Range {yAxisMin} - 850
            </div>
          </div>

          <div className="h-[360px] w-full pt-4">
            <ChartContainer config={chartConfig} className="h-full w-full aspect-auto">
              <AreaChart data={lineChartData} margin={{ top: 22, right: 18, left: 4, bottom: 8 }}>
                <defs>
                  {BUREAU_SERIES.map((series) => (
                    <React.Fragment key={series.key}>
                      <linearGradient id={`${chartId}-${series.key}-fill`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={series.color} stopOpacity={0.30} />
                        <stop offset="55%" stopColor={series.color} stopOpacity={0.10} />
                        <stop offset="100%" stopColor={series.color} stopOpacity={0.01} />
                      </linearGradient>
                      <filter id={`${chartId}-${series.key}-glow`} x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="0" dy="18" stdDeviation="16" floodColor={series.color} floodOpacity="0.22" />
                      </filter>
                    </React.Fragment>
                  ))}
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="hsl(var(--border) / 0.35)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatAxisDate}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  minTickGap={20}
                  dy={8}
                />
                <YAxis
                  domain={[yAxisMin, 850]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value) => `${value}`}
                  width={48}
                />
                <ChartTooltip
                  cursor={{ stroke: 'hsl(var(--border))', strokeDasharray: '4 4', strokeOpacity: 0.55 }}
                  content={
                    <ChartTooltipContent
                      className="min-w-[220px] rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-3 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-950/90"
                      labelFormatter={(value) => formatTooltipDate(String(value || ''))}
                      formatter={(value, _name, item) => {
                        const series = BUREAU_SERIES.find((entry) => entry.key === item.dataKey);

                        return (
                          <div className="flex w-full items-center justify-between gap-6">
                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{
                                  backgroundColor: series?.color || item.color,
                                  boxShadow: `0 0 0 4px ${(series?.color || item.color || '#94A3B8')}22`,
                                }}
                              />
                              <span>{series?.bureau || item.name}</span>
                            </div>
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              {typeof value === 'number' ? value : 'N/A'}
                            </span>
                          </div>
                        );
                      }}
                    />
                  }
                />
                {BUREAU_SERIES.map((series) => (
                  <Area
                    key={series.key}
                    type="monotone"
                    dataKey={series.key}
                    name={series.bureau}
                    stroke={series.color}
                    fill={`url(#${chartId}-${series.key}-fill)`}
                    strokeWidth={3}
                    fillOpacity={1}
                    dot={renderGlowDot(series.color)}
                    activeDot={renderActiveGlowDot(series.color)}
                    connectNulls={true}
                    filter={`url(#${chartId}-${series.key}-glow)`}
                  />
                ))}
              </AreaChart>
            </ChartContainer>
          </div>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-3">
          {BUREAU_SERIES.map((series) => {
            const currentScore = currentScores.find((score) => score.bureau === series.bureau);
            const averageScore = averageScores.find((score) => score.bureau === series.bureau);

            return (
              <div
                key={series.key}
                className="relative overflow-hidden rounded-[26px] border border-slate-200/70 bg-white/85 p-5 shadow-[0_20px_48px_-32px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-slate-950/45"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${series.tintClassName}`} />
                <div className="relative space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        {series.bureau}
                      </div>
                      <div className="mt-3 text-3xl font-bold tracking-tight text-foreground">
                        {currentScore?.score ?? 'N/A'}
                      </div>
                    </div>
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/40 bg-white/70 dark:border-slate-700 dark:bg-slate-900/60"
                      style={{ boxShadow: `0 18px 40px -24px ${series.color}` }}
                    >
                      <span
                        className="h-4 w-4 rounded-full"
                        style={{
                          backgroundColor: series.color,
                          boxShadow: `0 0 0 6px ${series.color}22`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Model</span>
                    <span className="font-semibold text-foreground">
                      {currentScore?.scoreType || 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Average</span>
                    <span className="font-semibold text-foreground">
                      {averageScore?.score ?? 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Latest refresh</span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {formatAxisDate(currentScore?.date || 'N/A')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default BureauScoresChart;
