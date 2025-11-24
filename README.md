# @entro314labs/entro-svelte

SvelteKit integration for [Entrolytics](https://entrolytics.click) - First-party growth analytics for the edge.

## Installation

```bash
npm install @entro314labs/entro-svelte
# or
pnpm add @entro314labs/entro-svelte
```

## Quick Start

```svelte
<!-- +layout.svelte -->
<script>
  import { initEntrolytics } from '@entro314labs/entro-svelte';

  initEntrolytics({
    websiteId: 'your-website-id',
  });
</script>

<slot />
```

## Configuration Options

```ts
initEntrolytics({
  // Required: Your Entrolytics website ID
  websiteId: 'your-website-id',

  // Optional: Custom host (for self-hosted)
  host: 'https://entrolytics.click',

  // Optional: Auto-track page views (default: true)
  autoTrack: true,

  // Optional: Respect Do Not Track (default: false)
  respectDnt: false,

  // Optional: Cross-domain tracking
  domains: ['example.com', 'blog.example.com'],
});
```

## Tracking Events

### trackEvent

```svelte
<script>
  import { trackEvent } from '@entro314labs/entro-svelte';

  function handlePurchase() {
    trackEvent('purchase', {
      revenue: 99.99,
      currency: 'USD'
    });
  }
</script>

<button on:click={handlePurchase}>Buy Now</button>
```

### trackClick Action

Use the Svelte action for declarative click tracking:

```svelte
<script>
  import { trackClick } from '@entro314labs/entro-svelte';
</script>

<button use:trackClick={{ event: 'cta_click', data: { variant: 'hero' } }}>
  Get Started
</button>
```

## Page View Tracking

### Automatic (with SvelteKit)

```svelte
<!-- +layout.svelte -->
<script>
  import { page } from '$app/stores';
  import { initEntrolytics, usePageView } from '@entro314labs/entro-svelte';

  initEntrolytics({ websiteId: 'your-website-id' });
  usePageView(page);
</script>

<slot />
```

### Manual

```svelte
<script>
  import { trackPageView } from '@entro314labs/entro-svelte';

  // Track current page
  trackPageView();

  // Track specific URL
  trackPageView('/custom-path', 'https://referrer.com');
</script>
```

## User Identification

```svelte
<script>
  import { identify } from '@entro314labs/entro-svelte';

  // When user logs in
  function handleLogin(user) {
    identify(user.id, {
      email: user.email,
      plan: user.subscription
    });
  }
</script>
```

## Stores

### isLoaded

Check if the tracking script is loaded:

```svelte
<script>
  import { isLoaded } from '@entro314labs/entro-svelte';
</script>

{#if $isLoaded}
  <p>Analytics loaded!</p>
{/if}
```

## TypeScript

Full TypeScript support with exported types:

```ts
import type { EntrolyticsOptions } from '@entro314labs/entro-svelte';
```

## License

MIT License - see [LICENSE](LICENSE) file for details.
