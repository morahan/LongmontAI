async (page) => {
  const currentUrl = page.url();
  const baseUrl = currentUrl && currentUrl !== 'about:blank'
    ? await page.evaluate(() => window.location.origin)
    : 'http://localhost:5173';
  const runId = currentUrl.match(/[?&]__longmont_mobile_audit_run=([A-Za-z0-9_-]+)(?:[&#]|$)/)?.[1] || 'manual';
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(runId)) throw new Error('Invalid mobile audit run id.');
  const outputDir = `output/playwright/mobile-audit/${runId}`;
  const viewports = [
    { name: 'narrow-phone', width: 360, height: 740 },
    { name: 'iphone-12', width: 390, height: 844 },
    { name: 'large-phone', width: 430, height: 932 },
    { name: 'desktop-smoke', width: 1280, height: 800, smoke: true },
  ];
  const runtimeFailures = [];
  const runtimeChecks = [];
  let activeRoute = 'bootstrap';
  const optionalApiPaths = new Set(['/api/model-watch', '/api/scheduled-edition', '/api/newsletter/subscribe']);
  page.on?.('pageerror', (error) => runtimeFailures.push({ route: activeRoute, type: 'pageerror', message: error.message }));
  page.on?.('console', (message) => {
    const text = message.text();
    // HTTP failures are classified with their URL by the response listener below.
    if (message.type() === 'error' && !/^Failed to load resource: the server responded with a status of \d{3}/.test(text)) {
      runtimeFailures.push({ route: activeRoute, type: 'console', message: text });
    }
  });
  const sameOriginPath = (value) => value.startsWith(`${baseUrl}/`)
    ? value.slice(baseUrl.length).split(/[?#]/, 1)[0]
    : null;
  page.on?.('requestfailed', (request) => {
    const url = request.url();
    const path = sameOriginPath(url);
    const error = request.failure()?.errorText ?? 'request failed';
    if (path && !optionalApiPaths.has(path) && !/ERR_ABORTED/.test(error)) {
      runtimeFailures.push({ route: activeRoute, type: 'requestfailed', url, message: error });
    }
  });
  page.on?.('response', (response) => {
    const routeAtResponse = activeRoute;
    runtimeChecks.push((async () => {
      const url = response.url();
      const path = sameOriginPath(url);
      const status = response.status();
      const controlledOptional4xx = optionalApiPaths.has(path) && status >= 400 && status < 500;
      const controlledNewsletterFallback = path === '/api/newsletter/subscribe'
        && status === 502
        && await response.headerValue('x-longmont-audit-expected') === 'newsletter-fallback';
      if (path && status >= 400 && !controlledOptional4xx && !controlledNewsletterFallback) {
        runtimeFailures.push({ route: routeAtResponse, type: 'response', url, status });
      }
    })());
  });
  const seededRoutes = [
    '/',
    '/tools',
    '/model-watch',
    '/timeline',
    '/newsletter',
    '/countdown',
    '/leaderboard',
    '/about',
    '/edition/edition-2026-06-10-ai-landscape',
  ];
  let requestedRoutes;
  const hasRouteTransport = currentUrl && currentUrl !== 'about:blank' &&
    /[?&]__longmont_mobile_audit_routes=/.test(currentUrl);
  const routeTransportMatch = hasRouteTransport
    ? currentUrl.match(/[?&]__longmont_mobile_audit_routes=([A-Za-z0-9_-]*)(?:[&#]|$)/)
    : null;
  const encodedRoutes = hasRouteTransport ? (routeTransportMatch?.[1] ?? '') : null;
  if (encodedRoutes !== null) {
    try {
      if (!/^[A-Za-z0-9_-]+$/.test(encodedRoutes)) throw new Error('invalid base64url');
      const { canonical, parsed } = await page.evaluate((encoded) => {
        const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
        const bytes = Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
        const canonicalValue = btoa(String.fromCharCode(...bytes))
          .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        return { canonical: canonicalValue, parsed: JSON.parse(new TextDecoder().decode(bytes)) };
      }, encodedRoutes);
      if (canonical !== encodedRoutes) throw new Error('non-canonical base64url');
      const validRoute = (route) => typeof route === 'string' &&
        route.length <= 2048 &&
        (route === '/' || /^\/(?:[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?)(?:\/[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?)*$/.test(route));
      if (!Array.isArray(parsed) || parsed.length === 0 || parsed.length > 50 || !parsed.every(validRoute)) {
        throw new Error('expected 1-50 normalized same-origin routes');
      }
      requestedRoutes = parsed;
    } catch (error) {
      throw new Error(`Invalid targeted mobile audit route transport: ${error.message}`, { cause: error });
    }
  }

  async function sameOriginRoutesFromCurrentPage() {
    return page.evaluate(() => {
      const origin = window.location.origin;
      return Array.from(document.querySelectorAll('a[href]'))
        .map((anchor) => {
          const resolver = document.createElement('a');
          resolver.href = anchor.getAttribute('href');
          return resolver;
        })
        .filter((url) => url.origin === origin)
        .map((url) => `${url.pathname}${url.search}${url.hash}`);
    });
  }

  activeRoute = '/';
  const bootstrapResponse = await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
  if (bootstrapResponse && !bootstrapResponse.ok()) {
    throw new Error(`Bootstrap navigation failed with status ${bootstrapResponse.status()}`);
  }
  await page.waitForFunction(
    () => Boolean(document.querySelector('#archive-heading')),
    undefined,
    { timeout: 10_000 }
  );
  const discoveredRoutes = await sameOriginRoutesFromCurrentPage();
  const latestEditionRoute = discoveredRoutes.find((route) => route.startsWith('/edition/'));
  if (!requestedRoutes && !latestEditionRoute) {
    throw new Error('Full mobile audit could not discover a linked edition from the ready home archive.');
  }
  const routes = Array.from(new Set(
    requestedRoutes ?? [...seededRoutes, latestEditionRoute].filter(Boolean)
  ));

  const results = [];

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const viewportRoutes = viewport.smoke ? routes.filter((route) => ['/', '/tools', '/newsletter'].includes(route)) : routes;

    for (const route of viewportRoutes) {
      activeRoute = route;
      const url = `${baseUrl}${route}`;
      const navigationResponse = await page.goto(url, { waitUntil: 'domcontentloaded' });
      if (navigationResponse && !navigationResponse.ok()) {
        throw new Error(`Navigation ${route} failed with status ${navigationResponse.status()}`);
      }
      await page.waitForFunction(
        (currentRoute) => {
          const identities = {
            '/': { selector: '#archive-heading', text: 'All Editions' },
            '/tools': { selector: 'main h1', text: 'AI Capabilities Matrix' },
            '/model-watch': { selector: '#model-watch-title', text: 'Model Watch' },
            '/timeline': { selector: '#timeline-title', text: 'AI Timeline' },
            '/newsletter': { selector: '#newsletter-title', text: 'The LongmontAI AI Briefing' },
            '/leaderboard': { selector: '#leaderboard-title', text: 'Leaderboard' },
            '/about': { selector: 'main h1', text: 'About LongmontAI' },
          };
          if (currentRoute.startsWith('/edition/')) {
            const article = document.querySelector('article[data-edition-id]');
            return article?.getAttribute('data-edition-id') === currentRoute.slice('/edition/'.length)
              && Boolean(article.querySelector('h1')?.textContent?.trim());
          }
          if (currentRoute === '/countdown') {
            return Boolean(document.querySelector('[data-page="countdown"] h1')?.textContent?.trim());
          }
          const identity = identities[currentRoute];
          if (!identity) return false;
          const heading = document.querySelector(identity.selector);
          const text = heading?.textContent?.replace(/\s+/g, ' ').trim();
          return Boolean(text && (!identity.text || text === identity.text));
        },
        route,
        { timeout: 10_000 }
      );
      await page.waitForFunction(
        () => Array.from(document.images).every((image) => image.complete),
        undefined,
        { timeout: 10_000 }
      );

      const audit = await page.evaluate(() => {
        const viewportWidth = window.innerWidth;
        const visibleElements = Array.from(document.body.querySelectorAll('*'))
          .filter((element) => {
            const style = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return style.display !== 'none' &&
              style.visibility !== 'hidden' &&
              rect.width > 1 &&
              rect.height > 1;
          });

        function isContainedByHorizontalScroller(element) {
          let parent = element.parentElement;
          while (parent && parent !== document.body) {
            const style = window.getComputedStyle(parent);
            const rect = parent.getBoundingClientRect();
            const allowsHorizontalScroll = ['auto', 'scroll', 'hidden'].includes(style.overflowX);
            if (allowsHorizontalScroll && rect.left >= -2 && rect.right <= viewportWidth + 2) {
              return true;
            }
            parent = parent.parentElement;
          }
          return false;
        }

        const overflowingElements = visibleElements
          .map((element) => {
            const rect = element.getBoundingClientRect();
            const tag = element.tagName.toLowerCase();
            const className = typeof element.className === 'string' ? element.className : '';
            return {
              element,
              tag,
              className: className.slice(0, 140),
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              width: Math.round(rect.width),
            };
          })
          .filter((item) => (item.left < -2 || item.right > viewportWidth + 2) && !isContainedByHorizontalScroller(item.element))
          .map((item) => ({
            tag: item.tag,
            className: item.className,
            left: item.left,
            right: item.right,
            width: item.width,
          }))
          .slice(0, 10);

        const brokenImages = Array.from(document.images)
          .filter((image) => image.complete && image.naturalWidth === 0)
          .map((image) => image.currentSrc || image.src)
          .slice(0, 10);

        const mediaLayoutFailures = Array.from(document.querySelectorAll(
          '.article-media, .slideshow-frame, .slideshow-embed-frame, .slideshow-embed-mobile'
        ))
          .filter((element) => {
            const style = window.getComputedStyle(element);
            return style.display !== 'none' && style.visibility !== 'hidden';
          })
          .map((element) => {
            const rect = element.getBoundingClientRect();
            return {
              selector: element.className,
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            };
          })
          .filter((media) =>
            media.left < -2 ||
            media.right > viewportWidth + 2 ||
            media.width < Math.min(260, viewportWidth * 0.72) ||
            media.height < 80
          )
          .slice(0, 10);

        const unreadableReleaseTables = Array.from(document.querySelectorAll('.release-table-wrap'))
          .map((wrapper) => {
            const table = wrapper.querySelector('table');
            if (!table) return null;

            return {
              wrapperWidth: Math.round(wrapper.getBoundingClientRect().width),
              tableWidth: Math.round(table.getBoundingClientRect().width),
              scrollWidth: Math.round(wrapper.scrollWidth),
              clientWidth: Math.round(wrapper.clientWidth),
            };
          })
          .filter((table) => table && table.scrollWidth <= table.clientWidth + 1);

        return {
          title: document.title,
          viewportWidth,
          scrollWidth: document.documentElement.scrollWidth,
          bodyScrollWidth: document.body.scrollWidth,
          overflowingElements,
          brokenImages,
          mediaLayoutFailures,
          unreadableReleaseTables,
        };
      });

      const cleanRoute = route === '/' ? 'home' : route.replace(/^\/+/, '').replace(/[^a-z0-9-]+/gi, '-');
      const screenshot = viewport.name === 'iphone-12'
        ? `${outputDir}/${viewport.name}-${cleanRoute}.png`
        : undefined;
      if (screenshot) {
        await page.screenshot({ path: screenshot, fullPage: true });
      }

      results.push({
        viewport,
        route,
        screenshot,
        ...audit,
      });
    }
  }

  if (typeof page.getByRole === 'function') {
    await page.setViewportSize({ width: 390, height: 844 });

    // Unknown routes must recover, not accidentally pass the published-page predicates.
    if (!requestedRoutes) {
      for (const [missingRoute, heading] of [
        ['/audit-missing-page', 'Page not found'],
        ['/edition/audit-missing-edition', 'Edition unavailable'],
      ]) {
        activeRoute = missingRoute;
        await page.goto(`${baseUrl}${missingRoute}`, { waitUntil: 'domcontentloaded' });
        await page.getByRole('heading', { name: heading, exact: true }).waitFor();
        await page.getByRole('link', { name: 'Back to editions', exact: true }).click();
        await page.locator('#archive-heading').waitFor();
        if (page.url() !== `${baseUrl}/`) throw new Error('Unknown route recovery did not reach home');
      }
    }

    if (routes.includes('/')) {
      activeRoute = '/';
      await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: 'Open navigation menu' }).click();
      await page.getByRole('navigation', { name: 'Menu navigation' }).getByRole('link', { name: 'Newsletter' }).click();
      await page.getByRole('heading', { name: 'The LongmontAI AI Briefing' }).waitFor();

      activeRoute = '/';
      await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
      await page.getByPlaceholder('Search editions').fill('no-such-edition-contract-value');
      await page.getByRole('heading', { name: 'No editions found' }).waitFor();
      await page.getByRole('button', { name: 'Clear filters' }).click();
      await page.locator('.home-archive-row').first().waitFor();
      const archiveLink = page.locator('.home-archive-row').first();
      await archiveLink.scrollIntoViewIfNeeded();
      await page.waitForTimeout(100);
      const archiveY = await page.evaluate(() => window.scrollY);
      await archiveLink.click();
      await page.locator('article[data-edition-id] h1').waitFor();
      await page.waitForFunction(() => window.scrollY < 2).catch(() => { throw new Error('Navigation PUSH did not start edition at top'); });
      await page.evaluate(() => window.scrollTo(0, 450));
      await page.waitForTimeout(100);
      await page.goBack();
      await page.locator('#archive-heading').waitFor();
      await page.waitForFunction((y) => Math.abs(window.scrollY - y) < 2, archiveY).catch(() => { throw new Error('Navigation Back did not restore archive position'); });
      await page.goForward();
      await page.locator('article[data-edition-id] h1').waitFor();
      await page.waitForFunction(() => Math.abs(window.scrollY - 450) < 2).catch(() => { throw new Error('Navigation Forward did not restore edition position'); });
      await page.goto(`${baseUrl}/#archive`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => {
        const target = document.getElementById('archive');
        return target && Math.abs(target.getBoundingClientRect().top - parseFloat(getComputedStyle(target).scrollMarginTop)) < 2;
      }).catch(() => { throw new Error('Direct hash navigation lost anchor scroll margin'); });
      await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
      await page.locator('#archive-heading').waitFor();
      await page.locator('a[href="#latest"]').click();
      await page.waitForFunction(() => location.hash === '#latest' && Math.abs(document.getElementById('latest').getBoundingClientRect().top) < 2)
        .catch(() => { throw new Error('Same-document latest hash did not reach anchor'); });
      await page.locator('a[href="#archive"]').click();
      await page.waitForFunction(() => location.hash === '#archive' && Math.abs(document.getElementById('archive').getBoundingClientRect().top - parseFloat(getComputedStyle(document.getElementById('archive')).scrollMarginTop)) < 2)
        .catch(() => { throw new Error('Same-document archive hash did not reach anchor'); });
      await page.mouse.wheel(0, 200);
      await page.waitForTimeout(300);
      const hashEntryY = await page.evaluate(() => window.scrollY);
      await page.goBack();
      await page.waitForFunction(() => location.hash === '#latest');
      await page.waitForTimeout(300);
      await page.goForward();
      await page.waitForFunction((y) => location.hash === '#archive' && Math.abs(window.scrollY - y) < 2, hashEntryY)
        .catch(() => { throw new Error('Same-document hash POP did not preserve user scroll'); });
      await page.locator('.skip-link').focus();
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.activeElement?.id === 'main-content')
        .catch(() => { throw new Error('Skip link did not focus main content'); });
    }

    if (routes.includes('/tools')) {
      activeRoute = '/tools';
      await page.goto(`${baseUrl}/tools`, { waitUntil: 'domcontentloaded' });
      const toolCell = page.getByRole('button', { name: /: [1-9][0-9]* tools$/ }).first();
      await toolCell.click();
      await page.getByText('Input → Output', { exact: true }).waitFor();
    }

    if (routes.includes('/timeline')) {
      activeRoute = '/timeline';
      await page.goto(`${baseUrl}/timeline`, { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: 'Matrix' }).click();
      await page.getByRole('table', { name: 'AI timeline event matrix' }).waitFor();
    }

    if (routes.includes('/newsletter')) {
      let newsletterMode = 'success';
      let newsletterPayload;
      // Geometry must traverse the signup's shadow root, unlike document-wide selectors.
      for (const width of [360, 390, 430, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`${baseUrl}/newsletter`, { waitUntil: 'domcontentloaded' });
        const host = page.locator('longmont-newsletter-signup');
        await host.locator('input[name="email"]').waitFor();
        const fits = await host.evaluate((element) => {
          const form = element.shadowRoot.querySelector('form').getBoundingClientRect();
          const inputs = [...element.shadowRoot.querySelectorAll('input[name="email"],input[name="name"]')];
          if (inputs.length !== 2 || new Set(inputs.map((input) => input.name)).size !== 2) return false;
          const formStyle = getComputedStyle(element.shadowRoot.querySelector('form'));
          const contentLeft = form.left + parseFloat(formStyle.borderLeftWidth) + parseFloat(formStyle.paddingLeft);
          const contentRight = form.right - parseFloat(formStyle.borderRightWidth) - parseFloat(formStyle.paddingRight);
          const visibleAndContained = inputs.every((input) => {
            const field = input.getBoundingClientRect();
            const label = input.closest('label').getBoundingClientRect();
            const style = getComputedStyle(input);
            return field.width > 0 && field.height > 0 && style.visibility === 'visible' && Number(style.opacity) > 0
              && field.left >= contentLeft - 1 && field.right <= contentRight + 1
              && field.left >= label.left && field.right <= label.right + 1;
          });
          const [email, name] = inputs.map((input) => input.getBoundingClientRect());
          const noOverlap = email.right <= name.left || name.right <= email.left || email.bottom <= name.top || name.bottom <= email.top;
          return visibleAndContained && noOverlap;
        });
        if (!fits) throw new Error(`Newsletter shadow controls overflow at ${width}px`);
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.route('**/api/newsletter/subscribe', async (route) => {
        newsletterPayload = route.request().postDataJSON();
        if (newsletterMode === 'success') {
          await route.fulfill({ status: 202, contentType: 'application/json', body: JSON.stringify({ ok: true, status: 'confirmation_pending' }) });
        } else if (newsletterMode === 'known-error') {
          await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'invalid_email', message: 'Enter a valid email address.' }) });
        } else {
          await route.fulfill({
            status: 502,
            contentType: 'text/html',
            headers: { 'x-longmont-audit-expected': 'newsletter-fallback' },
            body: '<h1>Bad Gateway</h1>',
          });
        }
      });
      activeRoute = '/newsletter';
      await page.goto(`${baseUrl}/newsletter`, { waitUntil: 'domcontentloaded' });
      const signup = page.locator('longmont-newsletter-signup');
      await signup.locator('input[name="email"]').waitFor();
      if (!await signup.locator('input[value="weekly"]').isChecked()) throw new Error('Weekly default was not initialized');
      const initialized = await page.evaluate(async () => {
        const element = document.createElement('longmont-newsletter-signup');
        element.setAttribute('default-cadence', 'biweekly');
        document.querySelector('main').append(element);
        await new Promise((resolve) => setTimeout(resolve, 100));
        const checked = element.shadowRoot?.querySelector('input[value="biweekly"]')?.checked;
        element.remove();
        return checked;
      });
      if (!initialized) throw new Error('Biweekly attribute was not initialized');
      await signup.evaluate((element) => element.setAttribute('default-cadence', 'biweekly'));
      await page.waitForFunction(() => document.querySelector('longmont-newsletter-signup').shadowRoot.querySelector('input[value="biweekly"]').checked);
      await signup.locator('input[name="name"]').focus();
      await page.keyboard.press('Tab');
      const visibleFocus = await signup.evaluate((element) => {
        const input = element.shadowRoot.activeElement;
        return input?.name === 'cadence' && input.matches(':focus-visible')
          && getComputedStyle(input.closest('label')).outlineStyle !== 'none';
      });
      if (!visibleFocus) throw new Error('Newsletter cadence keyboard focus is invisible');
      await page.keyboard.press('ArrowLeft');
      await signup.evaluate((element) => element.setAttribute('default-cadence', 'weekly'));
      await signup.evaluate((element) => element.setAttribute('default-cadence', 'biweekly'));
      if (!await signup.locator('input[value="weekly"]').isChecked()) throw new Error('Default overwrote user cadence');
      await page.screenshot({ path: `${outputDir}/newsletter-keyboard-focus.png` });
      await signup.locator('input[name="email"]').fill('browser-contract@example.invalid');
      await signup.getByRole('button', { name: 'Get the briefing' }).click();
      await signup.getByText(/check your inbox/i).waitFor();
      if (newsletterPayload?.cadence !== 'weekly') throw new Error('Signup payload lost selected cadence');
      await signup.locator('input[value="weekly"]').focus();
      await page.keyboard.press('ArrowRight');
      if (!await signup.locator('input[value="biweekly"]').isChecked()) throw new Error('Keyboard could not select biweekly');
      const biweeklyFocus = await signup.locator('input[value="biweekly"]').evaluate((input) =>
        input.matches(':focus-visible') && getComputedStyle(input.closest('label')).outlineStyle !== 'none');
      if (!biweeklyFocus) throw new Error('Biweekly focus is invisible');
      await signup.locator('input[name="email"]').fill('browser-contract@example.invalid');
      await signup.getByRole('button', { name: 'Get the briefing' }).click();
      await signup.getByText(/check your inbox/i).waitFor();
      if (newsletterPayload?.cadence !== 'biweekly') throw new Error('Signup payload lost biweekly cadence');
      newsletterMode = 'known-error';
      await signup.locator('input[name="email"]').fill('browser-contract@example.invalid');
      await signup.getByRole('button', { name: 'Get the briefing' }).click();
      await signup.getByText(/valid email address/i).waitFor();
      newsletterMode = 'html-fallback';
      await signup.locator('input[name="email"]').fill('browser-contract@example.invalid');
      await signup.getByRole('button', { name: 'Get the briefing' }).click();
      await signup.getByText('Newsletter signup is temporarily unavailable.').waitFor();
      await page.unroute('**/api/newsletter/subscribe');
    }
  }

  await Promise.all(runtimeChecks);
  const failures = results.filter((result) =>
    result.scrollWidth > result.viewportWidth + 1 ||
    result.bodyScrollWidth > result.viewportWidth + 1 ||
    result.overflowingElements.length > 0 ||
    result.brokenImages.length > 0 ||
    result.mediaLayoutFailures.length > 0 ||
    result.unreadableReleaseTables.length > 0
  );

  if (failures.length > 0 || runtimeFailures.length > 0) {
    throw new Error(`Mobile audit failed: ${JSON.stringify({ layout: failures, runtime: runtimeFailures }, null, 2)}`);
  }

  return {
    status: 'PASS',
    routes,
    runtimeFailures,
    screenshots: results.flatMap((result) => result.screenshot ? [result.screenshot] : []),
  };
}
