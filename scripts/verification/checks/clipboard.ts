import assert from 'node:assert/strict';
import type { Page } from '../lib/page.ts';
import type { Showcase } from '../lib/types.ts';
import { waitFor } from '../lib/wait.ts';

export async function clipboard(page: Page, app: Showcase) {
  await page.viewport(1280, 800);
  await page.navigate(`http://127.0.0.1:${app.port}${app.codePath}`);
  const blocks = await page.evaluate<{ text: string; buttons: number; language?: string }[]>(
    "[...document.querySelectorAll('.doq-markdown pre')].map((p,i)=>({text:p.querySelector('code')?.innerText??p.innerText,buttons:p.querySelectorAll('.doq-code-copy').length,language:p.querySelector('code')?.className}))",
  );
  assert.ok(blocks.length >= 1);
  assert.ok(
    blocks.every((x) => x.buttons === 1),
    'each code block should have one copy button',
  );
  for (let i = 0; i < blocks.length; i++) {
    await page.click(`.doq-markdown pre:nth-of-type(${i + 1}) .doq-code-copy`);
    const button = `.doq-markdown pre:nth-of-type(${i + 1}) .doq-code-copy`;
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
