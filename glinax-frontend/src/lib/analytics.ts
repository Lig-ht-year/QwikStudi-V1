import { useEffect, useCallback } from 'react';
import { useChatStore } from '@/stores/chatStore';

// Analytics event types
export type AnalyticsEvent =
    | 'page_view'
    | 'chat_started'
    | 'message_sent'
    | 'quiz_opened'
    | 'summarize_opened'
    | 'tts_opened'
    | 'stt_opened'
    | 'theme_changed'
    | 'upgrade_clicked'
    | 'data_exported'
    | 'settings_changed';

interface AnalyticsData {
    event: AnalyticsEvent;
    properties?: Record<string, string | number | boolean>;
    timestamp: string;
    userId?: string;
    plan?: string;
}

// In-memory analytics queue (for demo - replace with real service)
const analyticsQueue: AnalyticsData[] = [];

/**
 * Track an analytics event
 * Replace the implementation with your actual analytics service
 * (Google Analytics, Mixpanel, Amplitude, PostHog, etc.)
 */
export function trackEvent(event: AnalyticsEvent, properties?: Record<string, string | number | boolean>) {
    const state = useChatStore.getState();

    const analyticsData: AnalyticsData = {
        event,
        properties,
        timestamp: new Date().toISOString(),
        userId: state.username || undefined,
        plan: state.plan,
    };

    // Add to queue
    analyticsQueue.push(analyticsData);

    // Log in development only
    if (process.env.NODE_ENV === 'development') {
        if (process.env.NODE_ENV === 'development') {
            console.log('[Analytics]', analyticsData);
        }
    }

    // TODO: Send to your analytics service
    // Example implementations:

    // Google Analytics 4
    // if (typeof window !== 'undefined' && window.gtag) {
    //     window.gtag('event', event, properties);
    // }

    // Mixpanel
    // if (typeof window !== 'undefined' && window.mixpanel) {
    //     window.mixpanel.track(event, properties);
    // }

    // PostHog
    // if (typeof window !== 'undefined' && window.posthog) {
    //     window.posthog.capture(event, properties);
    // }
}

/**
 * Track page views
 */
export function trackPageView(pageName: string) {
    trackEvent('page_view', { page: pageName });
}

/**
 * Hook for tracking page views automatically
 */
export function usePageTracking(pageName: string) {
    useEffect(() => {
        trackPageView(pageName);
    }, [pageName]);
}

/**
 * Hook for analytics with memoized track function
 */
export function useAnalytics() {
    const track = useCallback((event: AnalyticsEvent, properties?: Record<string, string | number | boolean>) => {
        trackEvent(event, properties);
    }, []);

    return { track, trackPageView };
}

/**
 * Get analytics queue (for debugging/export)
 */
export function getAnalyticsQueue() {
    return [...analyticsQueue];
}

/**
 * Clear analytics queue
 */
export function clearAnalyticsQueue() {
    analyticsQueue.length = 0;
}
