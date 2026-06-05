import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { persistAffiliateReferralId } from '@/lib/affiliateReferral';
import JoinAffiliate from './JoinAffiliate';

const DEFAULT_REGISTER_TITLE = 'Start Your Success Journey';
const PRODUCTION_AFFILIATE_EMBED_ROOT = 'https://thescoremachine.com/affiliate/embed';
const AFFILIATE_SLICE_HEIGHT_MESSAGE = 'scoremachine:affiliate-slice-height';
const DEFAULT_TOP_HEIGHT = 520;
const DEFAULT_BOTTOM_HEIGHT = 900;

function getDefaultAffiliateEmbedRoot() {
  return PRODUCTION_AFFILIATE_EMBED_ROOT;
}

function normalizeAffiliateEmbedRoot(rawUrl?: string) {
  const trimmed = String(rawUrl || '').trim();

  if (!trimmed) {
    return getDefaultAffiliateEmbedRoot();
  }

  if (trimmed.startsWith('/')) {
    if (typeof window === 'undefined') {
      return trimmed;
    }

    return new URL(trimmed, window.location.origin).toString();
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function buildAffiliateSliceUrl(embedRoot: string, slice: 'top' | 'bottom', registerTitle?: string) {
  if (typeof window === 'undefined') {
    return embedRoot;
  }

  const embedUrl = new URL(embedRoot, window.location.origin);
  const normalizedPath = embedUrl.pathname.replace(/\/+$/, '');

  if (normalizedPath.endsWith('/affiliate')) {
    embedUrl.pathname = `${normalizedPath}/embed/${slice}`;
  } else if (normalizedPath.endsWith('/affiliate/embed')) {
    embedUrl.pathname = `${normalizedPath}/${slice}`;
  } else {
    embedUrl.pathname = `${normalizedPath}/affiliate/embed/${slice}`;
  }

  if (slice === 'top') {
    embedUrl.searchParams.set('register_title', String(registerTitle || DEFAULT_REGISTER_TITLE));
  }

  return embedUrl.toString();
}

const AffiliateReferralIframe: React.FC = () => {
  const { affiliateId } = useParams<{ affiliateId?: string }>();
  const location = useLocation();
  const [topHeight, setTopHeight] = useState(DEFAULT_TOP_HEIGHT);
  const [bottomHeight, setBottomHeight] = useState(DEFAULT_BOTTOM_HEIGHT);

  const registerTitle = useMemo(() => {
    const queryTitle = new URLSearchParams(location.search).get('register_title');
    return String(queryTitle || DEFAULT_REGISTER_TITLE).trim() || DEFAULT_REGISTER_TITLE;
  }, [location.search]);

  const embedRoot = useMemo(() => {
    const configuredEmbedRoot = (import.meta as ImportMeta & {
      env?: Record<string, string | undefined>;
    }).env?.VITE_AFFILIATE_IFRAME_URL;

    return normalizeAffiliateEmbedRoot(configuredEmbedRoot);
  }, []);

  const trustedSliceOrigin = useMemo(() => {
    if (typeof window === 'undefined') {
      return '';
    }

    return new URL(embedRoot, window.location.origin).origin;
  }, [embedRoot]);

  const topSliceSrc = useMemo(() => {
    return buildAffiliateSliceUrl(embedRoot, 'top', registerTitle);
  }, [embedRoot, registerTitle]);

  const bottomSliceSrc = useMemo(() => {
    return buildAffiliateSliceUrl(embedRoot, 'bottom');
  }, [embedRoot]);

  useEffect(() => {
    if (!affiliateId) {
      return;
    }

    persistAffiliateReferralId(affiliateId);
  }, [affiliateId]);

  useEffect(() => {
    if (typeof window === 'undefined' || !trustedSliceOrigin) {
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== trustedSliceOrigin) {
        return;
      }

      if (event.data?.type !== AFFILIATE_SLICE_HEIGHT_MESSAGE) {
        return;
      }

      const nextHeight = Number(event.data?.height);
      if (!Number.isFinite(nextHeight) || nextHeight <= 0) {
        return;
      }

      if (event.data?.slice === 'top') {
        setTopHeight(Math.max(Math.ceil(nextHeight), 1));
        return;
      }

      if (event.data?.slice === 'bottom') {
        setBottomHeight(Math.max(Math.ceil(nextHeight), 1));
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [trustedSliceOrigin]);

  return (
    <div className="min-h-screen bg-white">
      <iframe
        id="affiliate-top"
        src={topSliceSrc}
        title="Affiliate Top"
        className="block w-full border-0"
        style={{ height: `${topHeight}px` }}
        loading="eager"
        referrerPolicy="strict-origin-when-cross-origin"
      />

      <JoinAffiliate embed forcedReferralAffiliateId={affiliateId} />

      <iframe
        id="affiliate-bottom"
        src={bottomSliceSrc}
        title="Affiliate Bottom"
        className="block w-full border-0"
        style={{ height: `${bottomHeight}px` }}
        loading="eager"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
};

export default AffiliateReferralIframe;