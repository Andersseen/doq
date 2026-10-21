import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { artifactDir, viewports } from '../lib/config.ts';
import type { Page } from '../lib/page.ts';
import type { Showcase } from '../lib/types.ts';
import { waitFor } from '../lib/wait.ts';

export async function responsive(page: Page, app: Showcase) {
  for (const [w, h] of viewports) {
    for (const path of app.paths) {
      await page.viewport(w, h);
      await page.navigate(`http://127.0.0.1:${app.port}${path}`);
      const m = await page.evaluate(
        `(()=>{const d=document.documentElement,r=document.querySelector('.doq-root'),a=document.querySelector('.doq-article'),t=document.querySelector('.doq-mobile-trigger');return{width:innerWidth,scroll:d.scrollWidth,client:d.clientWidth,trigger:t?getComputedStyle(t).display:'none',article:a?(()=>{const b=a.getBoundingClientRect();return{left:b.left,right:b.right,width:b.width}})():null,sidebar:r?.dataset.sidebar,title:!!document.querySelector('h1'),header:!!document.querySelector('.volt-header,.forge-header'),footer:!!document.querySelector('.volt-footer,.forge-footer'),body:d.innerText.length}})()`,
      );
      assert.equal(m.width, w);
      assert.ok(m.scroll <= m.client + 1, `${app.name} ${path} ${w}px document overflow: ${m.scroll}/${m.client}`);
      assert.ok(m.title, `${app.name} ${path} missing heading`);
      assert.ok(m.header && m.footer, `${app.name} ${path} host header/footer missing`);
      assert.ok(m.body > 100, `${app.name} ${path} content is unexpectedly empty`);
      if (m.article)
        assert.ok(m.article.left >= -1 && m.article.right <= w + 1, `${app.name} ${path} article clips at ${w}px`);
      if (path.startsWith('/docs/') && w <= 720) assert.notEqual(m.trigger, 'none', 'mobile menu should be visible');
      if (path.startsWith('/docs/') && w > 720)
        assert.equal(m.trigger, 'none', 'mobile menu should be hidden at desktop widths');
    }
    await page.navigate(`http://127.0.0.1:${app.port}${app.doc}`);
    await mkdir(artifactDir, { recursive: true });
    const themeSelector = app.key === 'a' ? '.theme-toggle' : '.forge-actions button[aria-label*=theme]';
    for (const themePass of [0, 1]) {
      const screenshot = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      const imagePath = join(
        artifactDir,
        `showcase-${app.key}-docs-${w}x${h}-${themePass ? 'alternate' : 'default'}.png`,
      );
      await writeFile(imagePath, Buffer.from(screenshot.data, 'base64'));
      console.log(`Screenshot: ${imagePath}`);
      if (themePass === 0) {
        const before = await page.evaluate(
          "document.querySelector('.volt-site,.forge-site')?.getAttribute('data-theme')",
        );
        await page.click(themeSelector);
        await waitFor(
          async () =>
            await page.evaluate(
              `document.querySelector('.volt-site,.forge-site')?.getAttribute('data-theme')!==${JSON.stringify(before)}`,
            ),
          'theme toggle at responsive viewport',
        );
      }
    }
    await page.click(themeSelector);
  }
}
