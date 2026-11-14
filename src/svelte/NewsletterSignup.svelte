<svelte:options customElement="longmont-newsletter-signup" />

<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import {
    readSubscribeResponse,
    signupMessage,
    subscribeRequest,
    SUBSCRIBE_URL,
    type SignupOutcome,
  } from '../lib/newsletterResponse';
  import { mountTurnstile, turnstileSiteKey, type TurnstileWidget } from '../lib/turnstile';

  let email = '';
  let name = '';
  let company = '';
  let loading = false;
  let notice: { tone: 'success' | 'error'; text: string } | undefined;
  let turnstileContainer: HTMLDivElement;
  let turnstileToken = '';
  let turnstile: TurnstileWidget | undefined;

  onMount(() => {
    if (!turnstileSiteKey) return;
    mountTurnstile(turnstileContainer, turnstileSiteKey, (token) => { turnstileToken = token; })
      .then((widget) => { turnstile = widget; })
      .catch(() => {
        notice = { tone: 'error', text: 'The human check could not load. Refresh the page to try again.' };
      });
  });

  onDestroy(() => turnstile?.remove());

  function show(outcome: SignupOutcome) {
    notice = { tone: outcome.result === 'received' ? 'success' : 'error', text: signupMessage(outcome) };
  }

  async function submit() {
    if (!turnstileSiteKey || !turnstileToken) {
      show({ result: turnstileSiteKey ? 'challenge' : 'unavailable' });
      return;
    }
    loading = true;
    notice = undefined;
    let outcome: SignupOutcome;
    try {
      const response = await fetch(SUBSCRIBE_URL, subscribeRequest({ email, name, website: company, turnstileToken }));
      outcome = await readSubscribeResponse(response);
    } catch {
      outcome = { result: 'unavailable' };
    } finally {
      loading = false;
      turnstileToken = '';
      turnstile?.reset();
    }
    show(outcome);
    if (outcome.result === 'received') {
      email = '';
      name = '';
    }
  }
</script>

<form class="newsletter-signup" on:submit|preventDefault={submit} aria-label="Subscribe to the LongmontAI newsletter">
  <div class="newsletter-signup-grid">
    <label>
      <span>Email</span>
      <input
        bind:value={email}
        type="email"
        name="email"
        autocomplete="email"
        required
        placeholder="you@example.com"
      />
    </label>
    <label>
      <span>Name</span>
      <input
        bind:value={name}
        type="text"
        name="name"
        autocomplete="name"
        placeholder="Optional"
      />
    </label>
  </div>

  <label class="newsletter-honey" aria-hidden="true">
    Company
    <input bind:value={company} type="text" name="company" tabindex="-1" autocomplete="off" />
  </label>

  <div class="newsletter-turnstile" bind:this={turnstileContainer}></div>

  <button type="submit" disabled={loading}>
    {loading ? 'Joining...' : 'Get the briefing'}
  </button>

  <p class={notice?.tone} role="status">{notice?.text ?? ''}</p>
</form>

<style>
  :host {
    display: block;
    container-type: inline-size;
  }

  /* The page's global reset does not reach into the shadow root. */
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  .newsletter-signup {
    display: grid;
    gap: 1rem;
    padding: clamp(1rem, 5cqi, 1.5rem);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    background: rgba(9, 9, 11, 0.62);
  }

  .newsletter-signup-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr);
    gap: 0.75rem;
  }

  label {
    min-width: 0;
  }

  label span {
    display: block;
    margin-bottom: 0.35rem;
    color: rgba(255, 255, 255, 0.62);
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  input {
    width: 100%;
    min-height: 2.6rem;
    padding: 0.75rem 0.85rem;
    border: 1px solid rgba(255, 255, 255, 0.11);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.055);
    color: #fff;
    font: inherit;
    /* 16px floor stops iOS Safari zooming the page on focus. */
    font-size: max(16px, 0.85rem);
    outline: none;
  }

  input::placeholder {
    color: rgba(255, 255, 255, 0.38);
  }

  input:focus {
    border-color: rgba(59, 130, 246, 0.72);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.18);
  }

  .newsletter-honey {
    position: absolute;
    left: -10000px;
    width: 1px;
    height: 1px;
    overflow: hidden;
  }

  .newsletter-turnstile:empty {
    display: none;
  }

  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 2.8rem;
    padding: 0.75rem 1rem;
    border: 1px solid rgba(59, 130, 246, 0.8);
    border-radius: 8px;
    background: #3b82f6;
    color: #fff;
    cursor: pointer;
    font: inherit;
    font-weight: 700;
    transition: transform 180ms ease, border-color 180ms ease, background 180ms ease;
  }

  button:hover,
  button:focus-visible {
    background: #2563eb;
    transform: translateY(-1px);
  }

  button:disabled {
    cursor: wait;
    opacity: 0.7;
    transform: none;
  }

  p {
    margin: 0;
    color: rgba(255, 255, 255, 0.64);
    font-size: 0.9rem;
  }

  /* Kept in the accessibility tree while empty so its first message is announced. */
  p:empty {
    position: absolute;
  }

  p.success {
    color: #93c5fd;
  }

  p.error {
    color: #fca5a5;
  }

  @container (max-width: 30rem) {
    .newsletter-signup-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
