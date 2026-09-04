import React, { useState, useEffect } from 'react';
import { Clock, Calendar, Sparkles, Radio } from 'lucide-react';

interface MastermindSession {
  id: string;
  title: string;
  dateStr: string;
  timeStr: string;
  targetDate: Date;
}

export const WebinarCountdown: React.FC = () => {
  // Mastermind schedule defined by user:
  // Session 1: Friday September 4, 2026 at 6:00 PM EST (EDT: UTC-4 => 22:00 UTC)
  // Session 2: Friday September 11, 2026 at 4:00 PM EST (EDT: UTC-4 => 20:00 UTC)
  const sessions: MastermindSession[] = [
    {
      id: 'session-1',
      title: 'Friday Mastermind (Session 1)',
      dateStr: 'Friday, Sept 4',
      timeStr: '6:00 PM EST',
      targetDate: new Date('2026-09-04T18:00:00-04:00')
    },
    {
      id: 'session-2',
      title: 'Friday Mastermind (Session 2)',
      dateStr: 'Friday, Sept 11',
      timeStr: '4:00 PM EST',
      targetDate: new Date('2026-09-11T16:00:00-04:00')
    }
  ];

  const [activeSession, setActiveSession] = useState<MastermindSession>(sessions[0]);
  const [followingSession, setFollowingSession] = useState<MastermindSession | null>(sessions[1]);
  const [isLive, setIsLive] = useState(false);
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();

      // Find current or next upcoming session
      // Session considered active until 90 minutes after start
      let current = sessions[0];
      let following: MastermindSession | null = sessions[1];

      const s1End = new Date(sessions[0].targetDate.getTime() + 90 * 60 * 1000);
      if (now > s1End) {
        current = sessions[1];
        following = null;
      }

      setActiveSession(current);
      setFollowingSession(following);

      const diff = current.targetDate.getTime() - now.getTime();

      // Check if session is live right now (from start time to +90 mins)
      if (diff <= 0 && diff >= -90 * 60 * 1000) {
        setIsLive(true);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setIsLive(false);

      if (diff <= 0) {
        // Passed both sessions
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-slate-900/90 border border-slate-700/70 rounded-2xl p-4 sm:p-5 backdrop-blur-md shadow-xl text-center max-w-xl mx-auto">
      {/* Session Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800 mb-3 text-xs">
        <div className="flex items-center justify-center sm:justify-start gap-2 text-cyan-400 font-bold uppercase tracking-wider">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
          </span>
          <span>{isLive ? 'Mastermind In Progress' : 'Next Mastermind Session'}</span>
        </div>
        <div className="text-slate-300 flex items-center justify-center sm:justify-end gap-1.5 font-semibold">
          <Calendar className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-white">{activeSession.dateStr}</span>
          <span className="text-cyan-300">@ {activeSession.timeStr}</span>
        </div>
      </div>

      {isLive ? (
        <div className="py-4 bg-rose-500/10 border border-rose-500/30 rounded-xl my-2">
          <div className="flex items-center justify-center gap-2 text-rose-400 font-extrabold text-base">
            <Radio className="w-5 h-5 animate-pulse" />
            <span>SESSION IS LIVE NOW</span>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Check your email or portal at <strong className="text-white">member.thecapsol.com</strong> for Zoom access.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2 sm:gap-3 text-white">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2 sm:p-2.5">
            <div className="text-xl sm:text-2xl font-black font-mono text-cyan-300">
              {String(timeLeft.days).padStart(2, '0')}
            </div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mt-0.5">Days</div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2 sm:p-2.5">
            <div className="text-xl sm:text-2xl font-black font-mono text-cyan-300">
              {String(timeLeft.hours).padStart(2, '0')}
            </div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mt-0.5">Hours</div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2 sm:p-2.5">
            <div className="text-xl sm:text-2xl font-black font-mono text-cyan-300">
              {String(timeLeft.minutes).padStart(2, '0')}
            </div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mt-0.5">Mins</div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2 sm:p-2.5">
            <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
              {String(timeLeft.seconds).padStart(2, '0')}
            </div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mt-0.5">Secs</div>
          </div>
        </div>
      )}

      {/* Following Session Schedule Notice */}
      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-1.5 text-[11px] text-slate-400">
        <div className="flex items-center gap-1 text-slate-300 font-medium">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          <span>Upcoming: <strong className="text-white">Friday, Sept 4 @ 6pm EST</strong></span>
        </div>
        {followingSession && (
          <div className="text-slate-400">
            Next up: <span className="text-cyan-300 font-semibold">{followingSession.dateStr} @ {followingSession.timeStr}</span>
          </div>
        )}
      </div>
    </div>
  );
};
