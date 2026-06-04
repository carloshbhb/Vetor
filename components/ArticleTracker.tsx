'use client';

import { useEffect, useRef } from 'react';
import { trackArticleRead, trackScrollDepth } from '@/lib/analytics';

interface ArticleTrackerProps {
  slug: string;
  title: string;
  readingTime: number;
}

export default function ArticleTracker({ slug, title, readingTime }: ArticleTrackerProps) {
  const hasTrackedRead = useRef(false);
  const maxScrollDepth = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const currentScroll = window.scrollY;
      const scrollPercent = Math.round((currentScroll / scrollHeight) * 100);

      // Track scroll depth milestones (25%, 50%, 75%, 90%)
      const milestones = [25, 50, 75, 90];
      for (const milestone of milestones) {
        if (scrollPercent >= milestone && maxScrollDepth.current < milestone) {
          maxScrollDepth.current = milestone;
          trackScrollDepth(slug, milestone);
        }
      }

      // Track article read when scrolling 90%
      if (scrollPercent >= 90 && !hasTrackedRead.current) {
        hasTrackedRead.current = true;
        trackArticleRead(slug, title, readingTime);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [slug, title, readingTime]);

  return null;
}