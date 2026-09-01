<svelte:options customElement="longmont-newsletter-signup" />

<script lang="ts">
  let email = '';
  let name = '';
  let cadence: 'weekly' | 'biweekly' = 'weekly';
  let company = '';
  let status: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  let message = '';

  export let source = 'newsletter-page';
  export let defaultCadence: 'weekly' | 'biweekly' = 'weekly';

  $: if (defaultCadence === 'weekly' || defaultCadence === 'biweekly') {
    cadence = cadence === 'weekly' || cadence === 'biweekly' ? cadence : defaultCadence;
  }

  async function submit() {
    status = 'loading';
    message = '';
    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          cadence,
          company,
          source,
          page: window.location.pathname,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.message || 'Unable to subscribe.');
      status = 'success';
      message = payload.status === 'confirmation_pending'
        ? 'You are on the briefing list. Check your inbox for the opt-in step.'
        : 'You are on the briefing intake list.';
      email = '';
      name = '';
    } catch (error) {
      status = 'error';
      message = error instanceof Error ? error.message : 'Newsletter signup is temporarily unavailable.';
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

  <fieldset>
    <legend>Cadence</legend>
    <div class="newsletter-cadence">
      <label class:active={cadence === 'weekly'}>
        <input bind:group={cadence} type="radio" name="cadence" value="weekly" />
        <span>Weekly</span>
      </label>
      <label class:active={cadence === 'biweekly'}>
        <input bind:group={cadence} type="radio" name="cadence" value="biweekly" />
        <span>Bi-weekly</span>
      </label>
    </div>
  </fieldset>

  <button type="submit" disabled={status === 'loading'}>
    {status === 'loading' ? 'Joining...' : 'Get the briefing'}
  </button>

  {#if message}
    <p class:success={status === 'success'} class:error={status === 'error'} aria-live="polite">
      {message}
    </p>
  {/if}
</form>

<style>
  :host {
    display: block;
  }

  .newsletter-signup {
    display: grid;
    gap: 0.9rem;
    padding: 1rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    background: rgba(9, 9, 11, 0.62);
  }

  .newsletter-signup-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr);
    gap: 0.75rem;
  }

  label,
  fieldset {
    min-width: 0;
    border: 0;
  }

  label span,
  legend {
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
    outline: none;
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

  .newsletter-cadence {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.5rem;
  }

  .newsletter-cadence label {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 2.5rem;
    padding: 0.55rem 0.65rem;
    border: 1px solid rgba(255, 255, 255, 0.11);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.05);
    cursor: pointer;
    transition: border-color 180ms ease, background 180ms ease, color 180ms ease;
  }

  .newsletter-cadence label.active {
    border-color: rgba(59, 130, 246, 0.68);
    background: rgba(59, 130, 246, 0.18);
    color: #fff;
  }

  .newsletter-cadence input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .newsletter-cadence span {
    margin: 0;
    color: inherit;
    font-size: 0.84rem;
    text-transform: none;
    letter-spacing: 0;
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

  p.success {
    color: #93c5fd;
  }

  p.error {
    color: #fca5a5;
  }

  @media (max-width: 720px) {
    .newsletter-signup-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
