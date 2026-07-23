async (page) => {
  const currentUrl = page.url();
  const baseUrl = currentUrl && currentUrl !== 'about:blank'
    ? await page.evaluate(() => window.location.origin)
    : 'http://localhost:5173';
  const outputDir = 'output/playwright/mobile-audit';
  const viewports = [
    { name: 'narrow-phone', width: 360, height: 740 },
    { name: 'iphone-12', width: 390, height: 844 },
    { name: 'large-phone', width: 430, height: 932 },
  ];
  const seededRoutes = ['/', '/countdown', '/about', '/tools', '/model-watch', '/timeline'];

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

  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
  const discoveredRoutes = await sameOriginRoutesFromCurrentPage();
  const routes = Array.from(new Set([...seededRoutes, ...discoveredRoutes]))
    .filter((route) => !route.startsWith('/#'))
    .sort((a, b) => a.localeCompare(b));

  const results = [];

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    for (const route of routes) {
      const url = `${baseUrl}${route}`;
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(350);

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
      const screenshot = `${outputDir}/${viewport.name}-${cleanRoute}.png`;
      await page.screenshot({ path: screenshot, fullPage: true });

      results.push({
        viewport,
        route,
        screenshot,
        ...audit,
      });
    }
  }

  const failures = results.filter((result) =>
    result.scrollWidth > result.viewportWidth + 1 ||
    result.bodyScrollWidth > result.viewportWidth + 1 ||
    result.overflowingElements.length > 0 ||
    result.brokenImages.length > 0 ||
    result.mediaLayoutFailures.length > 0 ||
    result.unreadableReleaseTables.length > 0
  );

  if (failures.length > 0) {
    throw new Error(`Mobile audit failed: ${JSON.stringify(failures, null, 2)}`);
  }

  return {
    status: 'PASS',
    routes,
    screenshots: results.map((result) => result.screenshot),
  };
}
