import assert from 'node:assert/strict';
import type { Page } from '../lib/page.ts';
import type { Showcase } from '../lib/types.ts';
import { waitFor } from '../lib/wait.ts';

export async function clipboard(page: Page, app: Showcase) {
  await page.viewport(1280, 800);
  await page.navigate(`http://127.0.0.1:${app.port}${app.codePath}`);
  // Code in an inactive tab panel (0.4 rich blocks) is not rendered, so only visible blocks are clicked; every block must have a button.
  const all = await page.evaluate<number>("document.querySelectorAll('.doq-markdown pre').length");
  const blocks = await page.evaluate<{ text: string; buttons: number; language?: string }[]>(
    "[...document.querySelectorAll('.doq-markdown pre')].filter(p=>p.getClientRects().length).map((p,i)=>{p.setAttribute('data-mvp-block',String(i));return {text:p.querySelector('code')?.textContent??p.textContent,buttons:p.querySelectorAll('.doq-code-copy').length,language:p.querySelector('code')?.className}})",
  );
  assert.ok(all >= blocks.length);
  assert.ok(blocks.length >= 1);
  assert.ok(
    blocks.every((x) => x.buttons === 1),
    'each code block should have one copy button',
  );
  for (let i = 0; i < blocks.length; i++) {
    const button = `.doq-markdown pre[data-mvp-block="${i}"] .doq-code-copy`;
    await page.click(button);
    await waitFor(
      async () => await page.evaluate(`document.querySelector(${JSON.stringify(button)})?.textContent==='Copied'`),
      'clipboard feedback',
    );
    const copied = await page.evaluate('navigator.clipboard.readText()');
    assert.equal(copied, blocks[i]?.text, `clipboard content differs for block ${i + 1}`);
    assert.equal(
      await page.evaluate(`document.querySelector(${JSON.stringify(button)}).getAttribute('aria-label')`),
      'Code copied',
    );
  }
  await page.press('Tab');
  await page.evaluate("document.querySelector('.doq-code-copy')?.focus()");
  await page.press('Enter');
  await waitFor(
    async () => await page.evaluate("document.querySelector('.doq-code-copy')?.textContent==='Copied'"),
    'keyboard copy activation',
  );
  const buttonsBefore = await page.evaluate("document.querySelectorAll('.doq-code-copy').length");
  await page.navigate(`http://127.0.0.1:${app.port}${app.nested}`);
  await page.navigate(`http://127.0.0.1:${app.port}${app.codePath}`);
  const state = await page.evaluate(
    "({buttons:document.querySelectorAll('.doq-code-copy').length,blocks:document.querySelectorAll('.doq-markdown pre').length})",
  );
  assert.equal(state.buttons, state.blocks);
  assert.ok(buttonsBefore >= 1);
  const noClipboard = await page.evaluate(
    "(()=>{const d=Object.getOwnPropertyDescriptor(Navigator.prototype,'clipboard');try{Object.defineProperty(navigator,'clipboard',{configurable:true,value:undefined});return true}catch{return false}})()",
  );
  if (noClipboard) {
    await page.click('.doq-code-copy');
    await waitFor(
      async () => await page.evaluate("document.querySelector('.doq-code-copy')?.textContent==='Copy unavailable'"),
      'clipboard unavailable feedback',
    );
  }
}
