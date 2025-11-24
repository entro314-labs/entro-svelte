import { onMount } from 'svelte';
import { writable, type Writable } from 'svelte/store';

const DEFAULT_HOST = 'https://entrolytics.click';
const SCRIPT_ID = 'entrolytics-script';

export interface EntrolyticsOptions {
  websiteId: string;
  host?: string;
  autoTrack?: boolean;
  respectDnt?: boolean;
  domains?: string[];
}

declare global {
  interface Window {
    entrolytics?: {
      track: (eventName: string, eventData?: Record<string, unknown>) => void;
      identify: (userId: string, traits?: Record<string, unknown>) => void;
    };
  }
}

// Store for tracking if script is loaded
export const isLoaded: Writable<boolean> = writable(false);

let initialized = false;

/**
 * Initialize Entrolytics tracking
 *
 * Call this in your root +layout.svelte
 *
 * @example
 * ```svelte
 * <script>
 *   import { initEntrolytics } from '@entro314labs/entro-svelte';
 *   initEntrolytics({ websiteId: 'your-website-id' });
 * </script>
 * ```
 */
export function initEntrolytics(options: EntrolyticsOptions): void {
  if (typeof window === 'undefined') return;
  if (initialized) return;

  initialized = true;

  const {
    websiteId,
    host = DEFAULT_HOST,
    autoTrack = true,
    respectDnt = false,
    domains,
  } = options;

  if (!websiteId) {
    throw new Error('[@entro314labs/entro-svelte] websiteId is required');
  }

  if (document.getElementById(SCRIPT_ID)) {
    isLoaded.set(true);
    return;
  }

  const script = document.createElement('script');
  script.id = SCRIPT_ID;
  script.src = `${host.replace(/\/$/, '')}/script.js`;
  script.defer = true;
  script.dataset.websiteId = websiteId;

  if (!autoTrack) {
    script.dataset.autoTrack = 'false';
  }
  if (respectDnt) {
    script.dataset.doNotTrack = 'true';
  }
  if (domains && domains.length > 0) {
    script.dataset.domains = domains.join(',');
  }

  script.onload = () => {
    isLoaded.set(true);
  };

  document.head.appendChild(script);
}

/**
 * Track a custom event
 *
 * @example
 * ```svelte
 * <script>
 *   import { trackEvent } from '@entro314labs/entro-svelte';
 *
 *   function handleClick() {
 *     trackEvent('button_click', { variant: 'primary' });
 *   }
 * </script>
 *
 * <button on:click={handleClick}>Click me</button>
 * ```
 */
export function trackEvent(eventName: string, eventData?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;

  const tryTrack = () => {
    if (window.entrolytics) {
      window.entrolytics.track(eventName, eventData);
    } else {
      setTimeout(tryTrack, 100);
    }
  };

  tryTrack();
}

/**
 * Identify a user
 *
 * @example
 * ```svelte
 * <script>
 *   import { identify } from '@entro314labs/entro-svelte';
 *
 *   // When user logs in
 *   identify(user.id, { email: user.email, plan: user.plan });
 * </script>
 * ```
 */
export function identify(userId: string, traits?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;

  const tryIdentify = () => {
    if (window.entrolytics) {
      window.entrolytics.identify(userId, traits);
    } else {
      setTimeout(tryIdentify, 100);
    }
  };

  tryIdentify();
}

/**
 * Track page view manually
 * Useful for SPA navigation
 */
export function trackPageView(url?: string, referrer?: string): void {
  if (typeof window === 'undefined') return;

  const tryTrack = () => {
    if (window.entrolytics) {
      window.entrolytics.track('pageview', {
        url: url || window.location.pathname,
        referrer: referrer || document.referrer,
      });
    } else {
      setTimeout(tryTrack, 100);
    }
  };

  tryTrack();
}

/**
 * Svelte action for tracking clicks
 *
 * @example
 * ```svelte
 * <script>
 *   import { trackClick } from '@entro314labs/entro-svelte';
 * </script>
 *
 * <button use:trackClick={{ event: 'cta_click', data: { variant: 'hero' } }}>
 *   Click me
 * </button>
 * ```
 */
export function trackClick(
  node: HTMLElement,
  params: { event: string; data?: Record<string, unknown> }
) {
  const handleClick = () => {
    trackEvent(params.event, params.data);
  };

  node.addEventListener('click', handleClick);

  return {
    update(newParams: { event: string; data?: Record<string, unknown> }) {
      params = newParams;
    },
    destroy() {
      node.removeEventListener('click', handleClick);
    },
  };
}

/**
 * Hook for tracking page views in SvelteKit
 *
 * Use in +layout.svelte to auto-track navigation
 *
 * @example
 * ```svelte
 * <script>
 *   import { page } from '$app/stores';
 *   import { usePageView } from '@entro314labs/entro-svelte';
 *
 *   usePageView(page);
 * </script>
 * ```
 */
export function usePageView(pageStore: { subscribe: (fn: (value: { url: URL }) => void) => () => void }): void {
  let lastPath = '';

  onMount(() => {
    const unsubscribe = pageStore.subscribe(($page) => {
      const currentPath = $page.url.pathname;
      if (currentPath !== lastPath) {
        lastPath = currentPath;
        // First page view is handled by auto-track
        if (lastPath !== '') {
          trackPageView(currentPath);
        }
      }
    });

    return unsubscribe;
  });
}
