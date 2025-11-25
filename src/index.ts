import { onMount } from 'svelte';
import { get, type Writable, writable } from 'svelte/store';

const DEFAULT_HOST = 'https://cloud.entrolytics.click';
const SCRIPT_ID = 'entrolytics-script';

export interface EventData {
  [key: string]: string | number | boolean | EventData | string[] | number[] | EventData[];
}

export interface EntrolyticsOptions {
  websiteId: string;
  host?: string;
  autoTrack?: boolean;
  respectDnt?: boolean;
  domains?: string[];
  /** Use edge runtime endpoints for faster response times (default: true) */
  useEdgeRuntime?: boolean;
  /** Custom tag for A/B testing */
  tag?: string;
  /** Strip query parameters from URLs */
  excludeSearch?: boolean;
  /** Strip hash from URLs */
  excludeHash?: boolean;
  /** Callback before sending data */
  beforeSend?: (type: string, payload: unknown) => unknown | null;
}

declare global {
  interface Window {
    entrolytics?: {
      track: (eventName?: string | object, eventData?: Record<string, unknown>) => void;
      identify: (data: Record<string, unknown>) => void;
    };
  }
}

// Store for tracking if script is loaded
export const isLoaded: Writable<boolean> = writable(false);
export const isReady: Writable<boolean> = writable(false);

let initialized = false;
let currentOptions: EntrolyticsOptions | null = null;
let currentTag: string | undefined;

function waitForTracker(callback: () => void): void {
  if (typeof window === 'undefined') return;

  const tryExecute = () => {
    if (window.entrolytics) {
      callback();
    } else {
      setTimeout(tryExecute, 100);
    }
  };

  tryExecute();
}

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
  currentOptions = options;
  currentTag = options.tag;

  const {
    websiteId,
    host = DEFAULT_HOST,
    autoTrack = true,
    respectDnt = false,
    domains,
    useEdgeRuntime = true,
    tag,
    excludeSearch = false,
    excludeHash = false,
  } = options;

  if (!websiteId) {
    throw new Error('[@entro314labs/entro-svelte] websiteId is required');
  }

  if (document.getElementById(SCRIPT_ID)) {
    isLoaded.set(true);
    isReady.set(true);
    return;
  }

  const script = document.createElement('script');
  script.id = SCRIPT_ID;

  // Use edge runtime script if enabled
  const scriptPath = useEdgeRuntime ? '/script-edge.js' : '/script.js';
  script.src = `${host.replace(/\/$/, '')}${scriptPath}`;
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
  if (tag) {
    script.dataset.tag = tag;
  }
  if (excludeSearch) {
    script.dataset.excludeSearch = 'true';
  }
  if (excludeHash) {
    script.dataset.excludeHash = 'true';
  }

  script.onload = () => {
    isLoaded.set(true);
    isReady.set(true);
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
export function trackEvent(eventName: string, eventData?: EventData): void {
  waitForTracker(() => {
    let payload: unknown = { name: eventName, data: eventData };

    if (currentOptions?.beforeSend) {
      payload = currentOptions.beforeSend('event', payload);
      if (payload === null) return;
    }

    if (currentTag) {
      (payload as Record<string, unknown>).tag = currentTag;
    }

    window.entrolytics?.track(eventName, eventData);
  });
}

/**
 * Track revenue event
 *
 * @example
 * ```svelte
 * <script>
 *   import { trackRevenue } from '@entro314labs/entro-svelte';
 *
 *   async function handlePurchase(product) {
 *     await processPayment();
 *     trackRevenue('purchase', product.price, 'USD', {
 *       productId: product.id,
 *       productName: product.name
 *     });
 *   }
 * </script>
 * ```
 */
export function trackRevenue(
  eventName: string,
  revenue: number,
  currency = 'USD',
  data?: EventData,
): void {
  waitForTracker(() => {
    const eventData: EventData = {
      ...data,
      revenue,
      currency,
    };

    if (currentTag) {
      eventData.tag = currentTag;
    }

    window.entrolytics?.track(eventName, eventData);
  });
}

/**
 * Track outbound link click
 *
 * @example
 * ```svelte
 * <script>
 *   import { trackOutboundLink } from '@entro314labs/entro-svelte';
 *
 *   function handleExternalClick(url: string) {
 *     trackOutboundLink(url, { placement: 'sidebar' });
 *   }
 * </script>
 * ```
 */
export function trackOutboundLink(url: string, data?: EventData): void {
  waitForTracker(() => {
    window.entrolytics?.track('outbound-link-click', {
      ...data,
      url,
    });
  });
}

/**
 * Identify with custom data
 *
 * @example
 * ```svelte
 * <script>
 *   import { identify } from '@entro314labs/entro-svelte';
 *
 *   identify({ company: 'Acme Corp', plan: 'enterprise' });
 * </script>
 * ```
 */
export function identify(data: EventData): void {
  waitForTracker(() => {
    window.entrolytics?.identify(data);
  });
}

/**
 * Identify a user by ID
 *
 * @example
 * ```svelte
 * <script>
 *   import { identifyUser } from '@entro314labs/entro-svelte';
 *
 *   // When user logs in
 *   identifyUser(user.id, { email: user.email, plan: user.plan });
 * </script>
 * ```
 */
export function identifyUser(userId: string, traits?: EventData): void {
  waitForTracker(() => {
    window.entrolytics?.identify({ id: userId, ...traits });
  });
}

/**
 * Set tag for A/B testing
 */
export function setTag(tag: string): void {
  currentTag = tag;
}

/**
 * Track page view manually
 * Useful for SPA navigation
 */
export function trackPageView(url?: string, referrer?: string): void {
  waitForTracker(() => {
    const payload: Record<string, unknown> = {};
    if (url) payload.url = url;
    if (referrer) payload.referrer = referrer;
    if (currentTag) payload.tag = currentTag;

    window.entrolytics?.track(payload);
  });
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
export function trackClick(node: HTMLElement, params: { event: string; data?: EventData }) {
  const handleClick = () => {
    trackEvent(params.event, params.data);
  };

  node.addEventListener('click', handleClick);

  return {
    update(newParams: { event: string; data?: EventData }) {
      params = newParams;
    },
    destroy() {
      node.removeEventListener('click', handleClick);
    },
  };
}

/**
 * Svelte action for tracking outbound links
 *
 * @example
 * ```svelte
 * <a href="https://example.com" use:outboundLink={{ data: { placement: 'footer' } }}>
 *   Visit Example
 * </a>
 * ```
 */
export function outboundLink(node: HTMLAnchorElement, params?: { data?: EventData }) {
  const handleClick = () => {
    const url = node.href;
    if (url) {
      trackOutboundLink(url, params?.data);
    }
  };

  node.addEventListener('click', handleClick);

  return {
    update(newParams?: { data?: EventData }) {
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
export function usePageView(pageStore: {
  subscribe: (fn: (value: { url: URL }) => void) => () => void;
}): void {
  let lastPath = '';

  onMount(() => {
    const unsubscribe = pageStore.subscribe($page => {
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
