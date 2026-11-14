<svelte:options customElement="longmont-newsletter-signup" />

<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte';
  import {
    firstName,
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
  let confirmedEmail = '';
  let confirmedFirstName = '';
  let confirmation: HTMLElement;

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
    if (outcome.result !== 'received') {
      show(outcome);
      return;
    }
    confirmedEmail = email;
    confirmedFirstName = firstName(name);
    email = '';
    name = '';
    await tick();
    confirmation.focus();
  }

  function startOver() {
    confirmedEmail = '';
  }
</script>

<section class="newsletter-confirmation" hidden={!confirmedEmail} aria-labelledby="newsletter-confirmation-title">
  <span class="newsletter-confirmation-mark" aria-hidden="true">
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  </span>
  <h2 id="newsletter-confirmation-title" tabindex="-1" bind:this={confirmation}>Check your inbox{confirmedFirstName ? `, ${confirmedFirstName}` : ''}</h2>
  <p class="newsletter-confirmation-lead">
    One step left. We're sending a confirmation link to
    <strong>{confirmedEmail}</strong>.
  </p>
  <ol>
    <li>Open the email from 1023 Digital, our newsletter partner. It can take a few minutes to arrive.</li>
    <li>Click the confirmation link to join the weekly briefing.</li>
  </ol>
  <p class="newsletter-confirmation-note">
    Nothing after ten minutes? Check your spam folder, or
    <button type="button" class="newsletter-link" on:click={startOver}>use a different email</button>.
  </p>
</section>

<form class="newsletter-signup" hidden={Boolean(confirmedEmail)} on:submit|preventDefault={submit} aria-label="Subscribe to the LongmontAI newsletter">
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

  [hidden] {
    display: none !important;
  }

  .newsletter-confirmation {
    display: grid;
    justify-items: start;
    gap: 0.85rem;
    padding: clamp(1.25rem, 6cqi, 1.75rem);
    border: 1px solid rgba(59, 130, 246, 0.55);
    border-radius: 12px;
    background:
      radial-gradient(120% 90% at 0% 0%, rgba(59, 130, 246, 0.22), transparent 60%),
      rgba(9, 9, 11, 0.72);
    box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.12), 0 18px 48px -24px rgba(59, 130, 246, 0.55);
    animation: newsletter-confirmation-in 320ms ease-out both;
  }

  .newsletter-confirmation-mark {
    display: inline-grid;
    place-items: center;
    width: 3rem;
    height: 3rem;
    border: 1px solid rgba(59, 130, 246, 0.7);
    border-radius: 999px;
    background: rgba(59, 130, 246, 0.18);
    color: #93c5fd;
  }

  .newsletter-confirmation h2 {
    margin: 0;
    color: #fff;
    font-size: clamp(1.35rem, 6cqi, 1.7rem);
    font-weight: 700;
    line-height: 1.15;
    letter-spacing: -0.01em;
    outline: none;
  }

  .newsletter-confirmation .newsletter-confirmation-lead {
    color: rgba(255, 255, 255, 0.82);
    font-size: 1rem;
    line-height: 1.5;
  }

  .newsletter-confirmation strong {
    color: #fff;
    font-weight: 600;
    overflow-wrap: anywhere;
  }

  .newsletter-confirmation ol {
    display: grid;
    gap: 0.5rem;
    margin: 0;
    padding: 0;
    list-style: none;
    counter-reset: step;
    color: rgba(255, 255, 255, 0.72);
    font-size: 0.92rem;
    line-height: 1.45;
  }

  .newsletter-confirmation li {
    display: grid;
    grid-template-columns: 1.5rem minmax(0, 1fr);
    gap: 0.6rem;
    align-items: start;
    counter-increment: step;
  }

  .newsletter-confirmation li::before {
    content: counter(step);
    display: grid;
    place-items: center;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 999px;
    background: rgba(59, 130, 246, 0.22);
    color: #bfdbfe;
    font-size: 0.75rem;
    font-weight: 700;
  }

  .newsletter-confirmation .newsletter-confirmation-note {
    padding-top: 0.85rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    width: 100%;
    font-size: 0.85rem;
  }

  button.newsletter-link {
    display: inline;
    min-height: 0;
    padding: 0;
    border: 0;
    border-radius: 2px;
    background: none;
    color: #93c5fd;
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 0.18em;
  }

  button.newsletter-link:hover,
  button.newsletter-link:focus-visible {
    background: none;
    color: #fff;
    transform: none;
  }

  button.newsletter-link:focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }

  @keyframes newsletter-confirmation-in {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .newsletter-confirmation {
      animation: none;
    }
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
