import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ExternalLink, Copy, Check, QrCode, Clock } from 'lucide-react';

interface QRCodeCardProps {
  url?: string;
  buttonText: string;
  isAvailable?: boolean;
  placeholderText?: string;
  size?: number;
  badge?: string;
  accentColor?: 'blue' | 'emerald' | 'cyan';
}

export const QRCodeCard: React.FC<QRCodeCardProps> = ({
  url,
  buttonText,
  isAvailable = true,
  placeholderText = 'Link Coming Soon',
  size = 140,
  badge,
  accentColor = 'blue'
}) => {
  const [copied, setCopied] = useState(false);
  const resolvedUrl =
    url && url.startsWith("/") && typeof window !== "undefined"
      ? new URL(url, window.location.origin).toString()
      : url;
  const isInternalUrl = !!url && url.startsWith("/");

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!resolvedUrl || !isAvailable) return;
    try {
      await navigator.clipboard.writeText(resolvedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = resolvedUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const buttonClasses = {
    blue: 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20',
    emerald: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20',
    cyan: 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-lg shadow-cyan-500/20'
  }[accentColor];

  return (
    <div className="flex flex-col items-center w-full">
      {/* Dynamic QR Code Frame with high-contrast white matting for phone cameras */}
      <div className="relative group p-3.5 bg-white rounded-2xl shadow-md transition-all duration-300 mb-4 border-2 border-slate-700/50">
        {isAvailable && resolvedUrl ? (
          <div className="flex flex-col items-center justify-center">
            <QRCodeSVG
              value={resolvedUrl}
              size={size}
              level="M"
              includeMargin={false}
              className="w-full h-auto max-w-[140px] max-h-[140px]"
            />
            <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              <QrCode className="w-3.5 h-3.5 text-blue-600" />
              <span>Scan with Phone</span>
            </div>
          </div>
        ) : (
          <div
            style={{ width: size, height: size }}
            className="flex flex-col items-center justify-center bg-slate-100 rounded-xl p-3 text-center max-w-[140px] max-h-[140px]"
          >
            <Clock className="w-6 h-6 text-amber-600 mb-1.5" />
            <span className="text-xs font-bold text-slate-800 leading-tight">
              QR Ready
            </span>
            <span className="text-[10px] text-slate-500 mt-1 uppercase font-semibold">
              {placeholderText}
            </span>
          </div>
        )}

        {badge && (
          <span className="absolute -top-3 right-2 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-blue-600 text-white rounded-full shadow-sm">
            {badge}
          </span>
        )}
      </div>

      {/* Action Buttons - Stacked cleanly so buttons never burst out of card containers */}
      <div className="w-full flex flex-col gap-2 mt-1">
        {isAvailable && resolvedUrl ? (
          <a
            id={`cta-btn-${buttonText.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
            href={isInternalUrl ? url : resolvedUrl}
            target={isInternalUrl ? undefined : "_blank"}
            rel={isInternalUrl ? undefined : "noopener noreferrer"}
            className={`w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm text-center transition-all active:scale-[0.98] ${buttonClasses}`}
          >
            <span className="truncate">{buttonText}</span>
            <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 opacity-80" />
          </a>
        ) : (
          <button
            id={`disabled-btn-${buttonText.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
            disabled
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700 text-center"
          >
            <span className="truncate">{buttonText}</span>
            <span className="text-[11px] font-normal opacity-70 shrink-0">({placeholderText})</span>
          </button>
        )}

        {isAvailable && resolvedUrl && (
          <button
            id={`copy-btn-${buttonText.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
            type="button"
            onClick={handleCopy}
            title="Copy URL to clipboard"
            className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
              copied
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                : 'bg-slate-900 border-slate-700/80 hover:bg-slate-800 text-slate-300 hover:text-white hover:border-slate-600'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-emerald-300 font-bold">Link Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Copy Direct Link</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
