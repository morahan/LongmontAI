import '../svelte/NewsletterSignup.svelte';

interface NewsletterSignupHostProps {
  source?: string;
  defaultCadence?: 'weekly' | 'biweekly';
}

export default function NewsletterSignupHost({
  source = 'website',
  defaultCadence = 'weekly',
}: NewsletterSignupHostProps) {
  return (
    <longmont-newsletter-signup
      source={source}
      default-cadence={defaultCadence}
    />
  );
}
