#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, mkdir, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const repo = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const chromeCandidates = [process.env.CHROME_BIN, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const viewports = [[375,812],[768,1024],[1280,800],[1440,900],[1920,1080]];
const apps = [
  { key:'a', name: 'Showcase A', port: 4173, root: 'apps/showcase-a/dist/analog/public', paths: ['/','/docs','/docs/components/button','/docs/overview'], doc: '/docs/components/button', nested: '/docs/components/navigation', toc: true, side: 'left', codePath: '/docs/components/button', tocPath: '/docs/overview' },
  { key:'b', name: 'Showcase B', port: 4174, root: 'apps/showcase-b/dist/analog/public', paths: ['/','/docs','/docs/onboarding/first-application','/docs/concepts/models'], doc: '/docs/onboarding/first-application', nested: '/docs/architecture/content-delivery', toc: false, side: 'right', codePath: '/docs/onboarding/first-application' },
];
const selectedApp = process.argv.includes('--app=a') ? 'a' : process.argv.includes('--app=b') ? 'b' : 'both';
const selectedApps = selectedApp === 'both' ? apps : apps.filter(a => a.key === selectedApp);
const checkFilters = process.argv.find(a => a.startsWith('--check='))?.slice(8).split(',').filter(Boolean)??[];
const consumerApp = process.env.MVP_CONSUMER_ROOT ? { key:'consumer',name:'External consumer',port:4175,distRoot:resolve(process.env.MVP_CONSUMER_ROOT),doc:'/docs/onboarding/first-application',nested:'/docs/concepts/models' } : null;
const artifactDir=resolve(process.env.MVP_ARTIFACT_DIR??join(tmpdir(),'doq-mvp-evidence'));
const tocFixtureDir=join(repo,'apps/showcase-a/src/content/docs/verification');
const results = [];
let temp;
let chrome;
const servers = [];
let cdp;
let fixturesPrepared=false;
const pass = (id, text) => { results.push({ id, status: 'PASS', text }); console.log(`PASS ${id} — ${text}`); };
const fail = (id, error) => { results.push({ id, status: 'FAIL', text: error.message }); console.error(`FAIL ${id} — ${error.message}`); };

class CDP {
  constructor(ws) { this.ws = new WebSocket(ws); this.nextId = 0; this.pending = new Map(); this.events = new Map(); this.ws.addEventListener('message', e => { const m=JSON.parse(e.data); if(m.id){const p=this.pending.get(m.id); if(p){this.pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result)}} else for(const fn of this.events.get(m.method)??[]) fn(m.params); }); }
  async ready() { await new Promise((resolve,reject)=>{this.ws.addEventListener('open',resolve,{once:true});this.ws.addEventListener('error',reject,{once:true})}); }
  send(method,params={}) { const id=++this.nextId; return new Promise((resolve,reject)=>{this.pending.set(id,{resolve,reject});this.ws.send(JSON.stringify({id,method,params}))}); }
  on(name,fn) { this.events.set(name,[...(this.events.get(name)??[]),fn]); }
  off(name,fn) { this.events.set(name,(this.events.get(name)??[]).filter(listener=>listener!==fn)); }
  async evaluate(expression, awaitPromise=true) { const r=await this.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result?.value; }
  close() { this.ws.close(); }
}

async function waitFor(test, message, timeout=15000) { const end=Date.now()+timeout; while(Date.now()<end){try{if(await test())return}catch{} await delay(100)} throw new Error(`Timed out waiting for ${message}`); }
async function launchChrome() {
  const { access } = await import('node:fs/promises');
  let bin;
  for (const candidate of chromeCandidates) { try { await access(candidate); bin=candidate; break; } catch {} }
  assert.ok(bin, `Chrome binary not found. Set CHROME_BIN; checked ${chromeCandidates.join(', ')}`);
  temp=await mkdtemp(join(tmpdir(),'doq-mvp-verify-'));
  chrome=spawn(bin,['--headless=new','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-extensions','--remote-debugging-port=0',`--user-data-dir=${join(temp,'profile')}`,'--no-sandbox','about:blank'],{stdio:'ignore'});
  const active=join(temp,'profile','DevToolsActivePort');
  await waitFor(async()=>{try{return (await readFile(active,'utf8')).trim().length>0}catch{return false}},'Chrome DevToolsActivePort');
  const [port]= (await readFile(active,'utf8')).trim().split('\n');
  const targets=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const target=targets.find(t=>t.type==='page'); assert.ok(target,'Chrome page target missing');
  cdp=new CDP(target.webSocketDebuggerUrl); await cdp.ready();
  await cdp.send('Page.enable'); await cdp.send('Runtime.enable'); await cdp.send('Network.enable'); await cdp.send('Log.enable');
  await cdp.send('Browser.grantPermissions',{origin:'http://127.0.0.1:4173',permissions:['clipboardReadWrite','clipboardSanitizedWrite']}).catch(()=>{});
  await cdp.send('Browser.grantPermissions',{origin:'http://127.0.0.1:4174',permissions:['clipboardReadWrite','clipboardSanitizedWrite']}).catch(()=>{});
  if(consumerApp)await cdp.send('Browser.grantPermissions',{origin:'http://127.0.0.1:4175',permissions:['clipboardReadWrite','clipboardSanitizedWrite']}).catch(()=>{});
  await cdp.send('Browser.setPermission',{permission:{name:'clipboard-read'},setting:'granted',origin:'http://127.0.0.1:4173'}).catch(()=>{});
  await cdp.send('Browser.setPermission',{permission:{name:'clipboard-read'},setting:'granted',origin:'http://127.0.0.1:4174'}).catch(()=>{});
  if(consumerApp)await cdp.send('Browser.setPermission',{permission:{name:'clipboard-read'},setting:'granted',origin:'http://127.0.0.1:4175'}).catch(()=>{});
  return bin;
}
async function startPreviews() {
  for (const app of selectedApps) {
    const root=app.distRoot??join(repo,app.root);
    try { await accessDir(root); } catch { throw new Error(`Missing production output ${root}; run pnpm build first.`); }
    const p=spawn(process.execPath,['scripts/preview-static.mjs',root],{cwd:repo,env:{...process.env,PORT:String(app.port)},stdio:'ignore'}); servers.push(p);
    await waitFor(async()=>{try{return (await fetch(`http://127.0.0.1:${app.port}/`)).ok}catch{return false}},`${app.name} preview on ${app.port}`);
  }
  if(consumerApp){const p=spawn(process.execPath,['scripts/preview-static.mjs',consumerApp.distRoot],{cwd:repo,env:{...process.env,PORT:String(consumerApp.port)},stdio:'ignore'});servers.push(p);await waitFor(async()=>{try{return(await fetch(`http://127.0.0.1:${consumerApp.port}/`)).ok}catch{return false}},'external consumer preview');}
}
async function accessDir(path) { const { stat }=await import('node:fs/promises'); if(!(await stat(path)).isDirectory())throw Error('not a directory'); }
async function runCommand(command,args,options={}) { const child=spawn(command,args,{cwd:repo,stdio:'inherit',...options});const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve)});if(code!==0)throw new Error(`${command} ${args.join(' ')} exited with ${code}`); }
async function prepareTocFixtures() {
  if(!selectedApps.some(app=>app.key==='a')||(checkFilters.length&&!checkFilters.includes('m16')))return false;
  try { await access(tocFixtureDir); throw new Error(`Refusing to overwrite existing fixture directory ${tocFixtureDir}`); } catch(error) { if(error.message.startsWith('Refusing'))throw error; }
  fixturesPrepared=true;
  await mkdir(tocFixtureDir,{recursive:true});
  const tocFiller=Array.from({length:12},(_,index)=>`Verification paragraph ${index+1}. ${'This sentence adds enough scrolling space. '.repeat(8)}\n\n`).join('');
  await writeFile(join(tocFixtureDir,'toc-fixture.md'),`---\ntitle: Temporary TOC verification fixture\ndescription: Temporary acceptance fixture.\ngroup: Verification\norder: 999\n---\n\n## Repeated heading\n\nFirst occurrence.\n\n${tocFiller}### Nested heading\n\nNested occurrence.\n\n## Repeated heading\n\nSecond occurrence.\n`);
  await writeFile(join(tocFixtureDir,'no-headings.md'),'---\ntitle: Temporary no-heading verification fixture\ndescription: Temporary acceptance fixture.\ngroup: Verification\norder: 1000\n---\n\nThis document intentionally has no headings.\n');
  await runCommand('pnpm',['exec','turbo','run','build','--force','--filter=showcase-a...']);
  return true;
}
async function restoreTocFixtures() {
  await rm(tocFixtureDir,{recursive:true,force:true});
  await runCommand('pnpm',['exec','turbo','run','build','--force','--filter=showcase-a...']);
}
async function viewport(width,height) { await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false}); const actual=await cdp.evaluate('({width:innerWidth,height:innerHeight})'); assert.deepEqual(actual,{width,height},'browser viewport differs from requested dimensions'); }
async function navigate(url) { await cdp.send('Page.navigate',{url}); await waitFor(async()=>await cdp.evaluate('document.readyState')==='complete','document load'); await waitFor(async()=>await cdp.evaluate("!!document.querySelector('doq-docs, .doq-index, .landing-a, .landing-b')"),'app content'); await delay(250); }
async function click(selector) { const rect=await cdp.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)return null;e.scrollIntoView({block:'center',inline:'center'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`); assert.ok(rect,`missing clickable ${selector}`); await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:rect.x,y:rect.y}); await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',x:rect.x,y:rect.y,button:'left',clickCount:1}); await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:rect.x,y:rect.y,button:'left',clickCount:1}); }
async function press(key) { const code=key==='Escape'?27:key==='Tab'?9:key==='Enter'?13:0; await cdp.send('Input.dispatchKeyEvent',{type:'keyDown',key,code:key,windowsVirtualKeyCode:code,nativeVirtualKeyCode:code}); await cdp.send('Input.dispatchKeyEvent',{type:'keyUp',key,code:key,windowsVirtualKeyCode:code,nativeVirtualKeyCode:code}); }
async function waitVisible(selector) { await waitFor(async()=>await cdp.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});return !!e&&getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().width>0})()`),`${selector} visible`); }

async function mobileNavigation(app) {
  await viewport(375,812); await navigate(`http://127.0.0.1:${app.port}${app.doc}`);
  let state=await cdp.evaluate(`(()=>{const b=document.querySelector('.doq-mobile-trigger'),n=document.querySelector('#doq-mobile-navigation');return{trigger:!!b,expanded:b?.getAttribute('aria-expanded'),display:getComputedStyle(n).display,docOverflow:document.documentElement.scrollWidth>innerWidth}})()`);
  assert.equal(state.trigger,true);assert.equal(state.expanded,'false');assert.equal(state.display,'none');assert.equal(state.docOverflow,false);
  await click('.doq-mobile-trigger'); await waitVisible('#doq-mobile-navigation');
  state=await cdp.evaluate(`(()=>{const b=document.querySelector('.doq-mobile-trigger'),n=document.querySelector('#doq-mobile-navigation'),r=n.getBoundingClientRect();return{expanded:b.getAttribute('aria-expanded'),focusInside:n.contains(document.activeElement),x:r.x,right:r.right,width:r.width,side:r.x>0?'right':'left'}})()`);
  assert.equal(state.expanded,'true');assert.ok(state.focusInside,'opening drawer should focus its first link');assert.ok(state.width<=375&&state.x>=0&&state.right<=375,'drawer must fit viewport');assert.equal(state.side,app.side);
  const group=await cdp.evaluate("(()=>{const d=document.querySelector('.doq-nav-group:not([open])');return d?{label:d.querySelector('summary').textContent,selector:'.doq-nav-group:not([open]) summary'}:null})()"); if(group){await click(group.selector);assert.ok(await cdp.evaluate("[...document.querySelectorAll('.doq-nav-group')].some(d=>d.open)"),'nested group must expand');}else assert.ok(await cdp.evaluate("[...document.querySelectorAll('.doq-nav-group')].some(d=>d.open)"),'active nested group should be expanded');
  await press('Tab');const focusStyle=await cdp.evaluate("(()=>{const e=document.activeElement,s=getComputedStyle(e);return document.querySelector('.doq-sidebar').contains(e)&&e.matches(':focus-visible')&&s.outlineStyle!=='none'&&s.outlineWidth!=='0px'})()"); assert.ok(focusStyle,'keyboard focus should stay in navigation and show a visible indicator');
  await cdp.evaluate("window.__doqKeys=[];document.addEventListener('keydown',e=>window.__doqKeys.push({key:e.key,target:e.target.className}),true)");await press('Escape');await delay(150);const escapeState=await cdp.evaluate("({expanded:document.querySelector('.doq-mobile-trigger').getAttribute('aria-expanded'),keys:window.__doqKeys})");assert.equal(escapeState.expanded,'false',`Escape should close drawer; browser delivered ${JSON.stringify(escapeState.keys)}`);
  assert.equal(await cdp.evaluate("document.activeElement.matches('.doq-mobile-trigger')"),true,'closing should return focus to trigger');
  const currentPath=await cdp.evaluate('location.pathname');await cdp.evaluate("window.__doqLinkClicks=[];document.querySelector('#doq-mobile-navigation').addEventListener('click',e=>window.__doqLinkClicks.push({tag:e.target.tagName,href:e.target.closest('a')?.getAttribute('href')}),true)");await click('.doq-mobile-trigger');await waitVisible('#doq-mobile-navigation');await click('.doq-nav-link:not(.is-active)');
  await waitFor(async()=>await cdp.evaluate(`location.pathname!==${JSON.stringify(currentPath)}`),'documentation route navigation');
  await waitFor(async()=>await cdp.evaluate("document.querySelector('.doq-nav-link.is-active')?.getAttribute('href')===location.pathname"),'new documentation route rendered');
  await delay(200);
  const afterNav=await cdp.evaluate("({expanded:document.querySelector('.doq-mobile-trigger')?.getAttribute('aria-expanded'),path:location.pathname,clicks:window.__doqLinkClicks})");assert.equal(afterNav.expanded,'false',`selecting a document link should close the mobile drawer: ${JSON.stringify(afterNav)}`);
  await navigate(`http://127.0.0.1:${app.port}${app.doc}`);
  for(let i=0;i<3;i++){await click('.doq-mobile-trigger');await waitVisible('#doq-mobile-navigation');assert.equal(await cdp.evaluate("document.querySelector('.doq-mobile-trigger').getAttribute('aria-expanded')"),'true');const closeBefore=await cdp.evaluate("(()=>{const e=document.querySelector('.doq-mobile-close'),r=e?.getBoundingClientRect(),hit=r&&document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{display:e?getComputedStyle(e).display:null,x:r?.x,y:r?.y,width:r?.width,height:r?.height,hit:hit?.outerHTML??null}})()");assert.ok(closeBefore.display!=='none'&&closeBefore.width>0,`close control should be visible: ${JSON.stringify(closeBefore)}`);await click('.doq-mobile-close');await delay(150);const closed=await cdp.evaluate("(()=>({expanded:document.querySelector('.doq-mobile-trigger')?.getAttribute('aria-expanded')??null,display:document.querySelector('.doq-sidebar')?getComputedStyle(document.querySelector('.doq-sidebar')).display:null,active:document.activeElement?.className??null,path:location.pathname,closeButton:!!document.querySelector('.doq-mobile-close')}))()");assert.equal(closed.expanded,'false',`close control should close the drawer: before=${JSON.stringify(closeBefore)}, after=${JSON.stringify(closed)}`);}
  await cdp.evaluate("document.querySelector('.doq-mobile-trigger').focus()");await press('Tab');assert.equal(await cdp.evaluate("document.querySelector('#doq-mobile-navigation').contains(document.activeElement)"),false,'Tab must skip descendants of the closed drawer');
  const hiddenFocusable=await cdp.evaluate("(()=>{const n=document.querySelector('#doq-mobile-navigation');return [...n.querySelectorAll('a,button,summary')].filter(e=>e.tabIndex>=0&&e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden').length})()"); assert.equal(hiddenFocusable,0,'closed drawer must not expose visible tabbable descendants');
}
async function responsive(app) {
  for (const [w,h] of viewports) {
    for (const path of app.paths) {
      await viewport(w,h);await navigate(`http://127.0.0.1:${app.port}${path}`);
      const m=await cdp.evaluate(`(()=>{const d=document.documentElement,r=document.querySelector('.doq-root'),a=document.querySelector('.doq-article'),t=document.querySelector('.doq-mobile-trigger');return{width:innerWidth,scroll:d.scrollWidth,client:d.clientWidth,trigger:t?getComputedStyle(t).display:'none',article:a?(()=>{const b=a.getBoundingClientRect();return{left:b.left,right:b.right,width:b.width}})():null,sidebar:r?.dataset.sidebar,title:!!document.querySelector('h1'),header:!!document.querySelector('.volt-header,.forge-header'),footer:!!document.querySelector('.volt-footer,.forge-footer'),body:d.innerText.length}})()`);
      assert.equal(m.width,w);assert.ok(m.scroll<=m.client+1,`${app.name} ${path} ${w}px document overflow: ${m.scroll}/${m.client}`);assert.ok(m.title,`${app.name} ${path} missing heading`);assert.ok(m.header&&m.footer,`${app.name} ${path} host header/footer missing`);assert.ok(m.body>100,`${app.name} ${path} content is unexpectedly empty`);
      if(m.article)assert.ok(m.article.left>=-1&&m.article.right<=w+1,`${app.name} ${path} article clips at ${w}px`);
      if(path.startsWith('/docs/')&&w<=720)assert.notEqual(m.trigger,'none','mobile menu should be visible');
      if(path.startsWith('/docs/')&&w>720)assert.equal(m.trigger,'none','mobile menu should be hidden at desktop widths');
    }
    await navigate(`http://127.0.0.1:${app.port}${app.doc}`);await mkdir(artifactDir,{recursive:true});
    const themeSelector=app.key==='a'?'.theme-toggle':'.forge-actions button[aria-label*=theme]';
    for(const themePass of [0,1]){
      const screenshot=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
      const imagePath=join(artifactDir,`showcase-${app.key}-docs-${w}x${h}-${themePass?'alternate':'default'}.png`);await writeFile(imagePath,Buffer.from(screenshot.data,'base64'));console.log(`Screenshot: ${imagePath}`);
      if(themePass===0){const before=await cdp.evaluate("document.querySelector('.volt-site,.forge-site')?.getAttribute('data-theme')");await click(themeSelector);await waitFor(async()=>await cdp.evaluate(`document.querySelector('.volt-site,.forge-site')?.getAttribute('data-theme')!==${JSON.stringify(before)}`),'theme toggle at responsive viewport');}
    }
    await click(themeSelector);
  }
}
async function dynamic(app) {
  await viewport(375,812);await navigate(`http://127.0.0.1:${app.port}${app.doc}`);
  for(const [w,h] of [[768,1024],[1280,800],[375,812]]) { await viewport(w,h);const m=await cdp.evaluate("({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,expanded:document.querySelector('.doq-mobile-trigger')?.getAttribute('aria-expanded'),side:document.querySelector('.doq-root')?.dataset.sidebar})");assert.ok(m.scroll<=m.width+1);if(w>720)assert.equal(m.expanded,'false'); }
  await viewport(375,812);await click('.doq-mobile-trigger');await waitVisible('#doq-mobile-navigation');await viewport(1280,800);await viewport(375,812);const drawer=await cdp.evaluate("({expanded:document.querySelector('.doq-mobile-trigger').getAttribute('aria-expanded'),display:getComputedStyle(document.querySelector('.doq-sidebar')).display,active:document.querySelector('.doq-nav-link.is-active')?.getAttribute('href'),focusInDrawer:document.querySelector('.doq-sidebar').contains(document.activeElement)})");assert.equal(drawer.expanded,'true');assert.notEqual(drawer.display,'none');assert.ok(drawer.active);assert.ok(drawer.focusInDrawer);
  await viewport(768,1024);await viewport(375,812);assert.equal(await cdp.evaluate("document.querySelector('.doq-mobile-trigger').getAttribute('aria-expanded')"),'true');
  const closedGroup=await cdp.evaluate("!!document.querySelector('.doq-nav-group:not([open]) summary')");if(closedGroup){await click('.doq-nav-group:not([open]) summary');await waitFor(async()=>await cdp.evaluate("[...document.querySelectorAll('.doq-nav-group')].some(g=>g.open)"),'nested group open after resize');}const targetHref=await cdp.evaluate("[...document.querySelectorAll('.doq-sidebar .doq-nav-link:not(.is-active)')].find(e=>e.getClientRects().length)?.getAttribute('href')??null");assert.ok(targetHref,'an alternate visible document link must be available');const beforeNavigation=await cdp.evaluate('location.pathname');await click(`.doq-nav-link[href=${JSON.stringify(targetHref)}]`);await waitFor(async()=>await cdp.evaluate(`location.pathname!==${JSON.stringify(beforeNavigation)}`),'navigation while drawer remains open');await waitFor(async()=>await cdp.evaluate("document.querySelector('.doq-mobile-trigger')?.getAttribute('aria-expanded')==='false'"),'route selection closes drawer');await viewport(1440,900);const desktop=await cdp.evaluate("({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,active:document.querySelector('.doq-nav-link.is-active')?.getAttribute('href'),path:location.pathname})");assert.ok(desktop.scroll<=desktop.width+1);assert.equal(desktop.active,desktop.path,'active page should remain selected after open-drawer navigation and desktop resize');
}
async function toc(app) {
  if(!app.toc){await navigate(`http://127.0.0.1:${app.port}${app.doc}`);assert.equal(await cdp.evaluate("!!document.querySelector('.doq-toc')"),false,'showTableOfContents=false should suppress TOC');return;}
  await viewport(1440,900);await navigate(`http://127.0.0.1:${app.port}${app.tocPath}`);await cdp.evaluate('window.scrollTo(0,0)');await delay(200);
  const anchors=await cdp.evaluate("(()=>{const h=[...document.querySelectorAll('.doq-markdown h2,.doq-markdown h3')],a=[...document.querySelectorAll('.doq-toc a')];return{headings:h.map(x=>({id:x.id,tag:x.tagName})),links:a.map(x=>x.getAttribute('href')),all:a.length>0&&a.every(x=>{const id=decodeURIComponent(x.hash.slice(1));return !!document.getElementById(id)})}})()");assert.ok(anchors.all,'TOC entries must match real headings');assert.ok(anchors.headings.some(x=>x.tag==='H2'));assert.ok(anchors.headings.some(x=>x.tag==='H3'));
  const link=await cdp.evaluate("document.querySelector('.doq-toc a')?.getAttribute('href')");assert.ok(link);await click('.doq-toc a');await waitFor(async()=>await cdp.evaluate(`location.hash===${JSON.stringify(new URL(link,'http://localhost').hash)}`),'TOC fragment update');
  const target=await cdp.evaluate("(()=>{const e=document.getElementById(decodeURIComponent(location.hash.slice(1)));return{top:e?.getBoundingClientRect().top,scroll:scrollY,id:e?.id}})()");assert.ok(target.id&&target.scroll>0,'TOC click should scroll to target');
  await navigate(`http://127.0.0.1:${app.port}/docs/verification/toc-fixture`);await cdp.evaluate('window.scrollTo(0,0)');await waitFor(async()=>await cdp.evaluate("!!document.querySelector('.doq-toc a.is-active')"),'initial active TOC heading after route change');
  const duplicate=await cdp.evaluate("(()=>{const h=[...document.querySelectorAll('.doq-markdown h2,.doq-markdown h3')],a=[...document.querySelectorAll('.doq-toc a')];return{ids:h.map(x=>x.id),links:a.map(x=>x.hash),match:a.every(x=>document.getElementById(decodeURIComponent(x.hash.slice(1))))}})()");assert.equal(new Set(duplicate.ids).size,duplicate.ids.length,'duplicate headings must receive unique IDs');assert.ok(duplicate.match);assert.ok(duplicate.ids.includes('repeated-heading-1'),'second duplicate should have a stable unique slug');
  const fixtureLink=await cdp.evaluate("document.querySelector('.doq-toc a')?.getAttribute('href')");assert.ok(fixtureLink);await click('.doq-toc a');await waitFor(async()=>await cdp.evaluate(`location.hash===${JSON.stringify(new URL(fixtureLink,'http://localhost').hash)}`),'fixture TOC fragment update');await cdp.evaluate('window.scrollTo(0,0)');await delay(200);
  const clickedHash=new URL(fixtureLink,'http://localhost').hash;const activeTarget=await cdp.evaluate(`(()=>{const hs=[...document.querySelectorAll('.doq-markdown h2,.doq-markdown h3')];for(const h of hs){if('#'+h.id===${JSON.stringify(clickedHash)})continue;const max=Math.max(0,document.documentElement.scrollHeight-innerHeight),top=h.getBoundingClientRect().top;if(top<innerHeight*.75)continue;return{id:h.id,scroll:Math.max(0,Math.min(scrollY+top-innerHeight*.2,max)),initialTop:top}}return null})()`);assert.ok(activeTarget,'long duplicate-heading fixture must place a different heading below the initial observer zone');await cdp.evaluate(`window.scrollTo(0,${activeTarget.scroll})`);
  try { await waitFor(async()=>await cdp.evaluate(`!!document.querySelector('.doq-toc a.is-active')&&document.querySelector('.doq-toc a.is-active')?.hash!==${JSON.stringify(clickedHash)}&&!!document.getElementById(decodeURIComponent(document.querySelector('.doq-toc a.is-active').hash.slice(1)))`),'active TOC heading changes after scrolling'); } catch(error) { const state=await cdp.evaluate(`(()=>({scrollY,viewport:innerHeight,clicked:${JSON.stringify(clickedHash)},target:${JSON.stringify(activeTarget.id)},targetTop:document.getElementById(${JSON.stringify(activeTarget.id)})?.getBoundingClientRect().top,active:document.querySelector('.doq-toc a.is-active')?.hash??null,headings:[...document.querySelectorAll('.doq-markdown h2,.doq-markdown h3')].map(h=>({id:h.id,top:h.getBoundingClientRect().top}))}))()`);throw new Error(`${error.message}; state=${JSON.stringify(state)}`); }
  const currentActive=await cdp.evaluate("document.querySelector('.doq-toc a.is-active')?.hash");assert.ok(currentActive&&currentActive!==clickedHash);const observedActiveId=decodeURIComponent(currentActive.slice(1));
  await cdp.send('Page.navigate',{url:`http://127.0.0.1:${app.port}/docs/verification/toc-fixture#${observedActiveId}`});await waitFor(async()=>await cdp.evaluate(`location.hash===${JSON.stringify(`#${observedActiveId}`)}`),'direct fragment navigation');await waitFor(async()=>await cdp.evaluate(`document.querySelector('.doq-toc a.is-active')?.hash===${JSON.stringify(`#${observedActiveId}`)}`),'TOC observer after direct fragment load');
  await navigate(`http://127.0.0.1:${app.port}/docs/components/button`);await navigate(`http://127.0.0.1:${app.port}/docs/verification/toc-fixture`);await cdp.evaluate(`document.getElementById(${JSON.stringify(observedActiveId)}).scrollIntoView({block:'start'})`);await waitFor(async()=>await cdp.evaluate(`document.querySelector('.doq-toc a.is-active')?.hash===${JSON.stringify(`#${observedActiveId}`)}`),'TOC observer after route lifecycle');
  await navigate(`http://127.0.0.1:${app.port}/docs/verification/no-headings`);assert.equal(await cdp.evaluate("!!document.querySelector('.doq-toc')"),false,'pages without headings should omit the TOC');
}
async function clipboard(app) {
  await viewport(1280,800);await navigate(`http://127.0.0.1:${app.port}${app.codePath}`);
  const blocks=await cdp.evaluate("[...document.querySelectorAll('.doq-markdown pre')].map((p,i)=>({text:p.querySelector('code')?.innerText??p.innerText,buttons:p.querySelectorAll('.doq-code-copy').length,language:p.querySelector('code')?.className}))");assert.ok(blocks.length>=1);assert.ok(blocks.every(x=>x.buttons===1),'each code block should have one copy button');
  for(let i=0;i<blocks.length;i++){await click(`.doq-markdown pre:nth-of-type(${i+1}) .doq-code-copy`);const button=`.doq-markdown pre:nth-of-type(${i+1}) .doq-code-copy`;await waitFor(async()=>await cdp.evaluate(`document.querySelector(${JSON.stringify(button)})?.textContent==='Copied'`),'clipboard feedback');const copied=await cdp.evaluate('navigator.clipboard.readText()');assert.equal(copied,blocks[i].text,`clipboard content differs for block ${i+1}`);assert.equal(await cdp.evaluate(`document.querySelector(${JSON.stringify(button)}).getAttribute('aria-label')`),'Code copied');}
  await press('Tab');
  await cdp.evaluate("document.querySelector('.doq-code-copy')?.focus()");await press('Enter');await waitFor(async()=>await cdp.evaluate("document.querySelector('.doq-code-copy')?.textContent==='Copied'"),'keyboard copy activation');
  const buttonsBefore=await cdp.evaluate("document.querySelectorAll('.doq-code-copy').length");await navigate(`http://127.0.0.1:${app.port}${app.nested}`);await navigate(`http://127.0.0.1:${app.port}${app.codePath}`);const state=await cdp.evaluate("({buttons:document.querySelectorAll('.doq-code-copy').length,blocks:document.querySelectorAll('.doq-markdown pre').length})");assert.equal(state.buttons,state.blocks);assert.ok(buttonsBefore>=1);
  const noClipboard=await cdp.evaluate("(()=>{const d=Object.getOwnPropertyDescriptor(Navigator.prototype,'clipboard');try{Object.defineProperty(navigator,'clipboard',{configurable:true,value:undefined});return true}catch{return false}})()");if(noClipboard){await click('.doq-code-copy');await waitFor(async()=>await cdp.evaluate("document.querySelector('.doq-code-copy')?.textContent==='Copy unavailable'"),'clipboard unavailable feedback');}
}
async function diagnostics(app) {
  const messages=[],listeners=[];for(const n of ['Runtime.exceptionThrown','Runtime.consoleAPICalled','Log.entryAdded','Network.loadingFailed']){const listener=p=>messages.push({type:n,params:p});listeners.push([n,listener]);cdp.on(n,listener)}
  await viewport(1440,900);for(const path of [app.doc,app.nested,app.doc]){await navigate(`http://127.0.0.1:${app.port}${path}`);await cdp.evaluate("document.querySelector('.doq-demo-button')?.click();document.querySelector('.forge-schema select')?.dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('.doq-theme-toggle,.theme-toggle,[aria-label*=theme i]')?.click()");if(await cdp.evaluate("!!document.querySelector('.doq-mobile-trigger')")){await viewport(375,812);await click('.doq-mobile-trigger');await press('Escape');await viewport(1440,900);}}
  await navigate(`http://127.0.0.1:${app.port}${app.doc}`);await cdp.send('Page.reload',{ignoreCache:true});await waitFor(async()=>await cdp.evaluate('document.readyState')==='complete','reload');await delay(300);
  const relevant=messages.filter(x=>x.type==='Runtime.exceptionThrown'||x.type==='Network.loadingFailed'||(x.type==='Runtime.consoleAPICalled'&&x.params.type==='error')||(x.type==='Log.entryAdded'&&x.params.entry.level==='error'));
  assert.deepEqual(relevant,[],`${app.name} browser diagnostics: ${JSON.stringify(relevant.map(x=>({type:x.type,text:x.params.exceptionDetails?.text??x.params.args?.map(a=>a.value).join(' ')??x.params.entry?.text??x.params.errorText})))}`);
  const warnings=messages.filter(x=>(x.type==='Runtime.consoleAPICalled'&&x.params.type==='warning')||(x.type==='Log.entryAdded'&&x.params.entry.level==='warning'));
  const warningText=warnings.map(x=>x.params.args?.map(a=>a.value).join(' ')??x.params.entry?.text??'').filter(Boolean);
  console.log(`M23 ${app.name}: ${warnings.length} browser warnings captured; hydration-related warnings: ${warningText.filter(x=>/hydration/i.test(x)).length}.`);
  for(const [name,listener] of listeners)cdp.off(name,listener);
  pass(`M23 ${app.name}`,'production routes, interactions and reload emitted no runtime exceptions, console errors or failed network requests');
}
async function main() {
  let chromeBin='';
  try {
    fixturesPrepared=await prepareTocFixtures();
    await startPreviews();chromeBin=await launchChrome();console.log(`Browser: ${chromeBin} (isolated headless Chrome via Chrome DevTools Protocol)`);
    try { const child=spawn(process.execPath,['scripts/verification/duplicate-routes.mjs'],{cwd:repo,stdio:'ignore'});const exit=await new Promise(resolve=>child.on('exit',resolve));assert.equal(exit,0,'duplicate route API fixture failed');pass('M9','real exported normalization/sorting API rejects duplicate routes and validates slug cases'); } catch(e){fail('M9',e)}
    for(const app of selectedApps){
      const checks=[['m15',`M15 ${app.name}`,()=>mobileNavigation(app)],['m24',`M24 ${app.name}`,()=>responsive(app)],['dynamic',`M24 dynamic ${app.name}`,()=>dynamic(app)],['m16',`M16 ${app.name}`,()=>toc(app)],['m17',`M17 ${app.name}`,()=>clipboard(app)],['m23',`M23 ${app.name}`,()=>diagnostics(app)]];
      for(const [key,id,fn] of checks.filter(([key])=>!checkFilters.length||checkFilters.includes(key))){try{await fn();if(id.startsWith('M15')||id.startsWith('M24')||id.startsWith('M16')||id.startsWith('M17'))pass(id,`production browser verification succeeded at required viewports for ${app.name}`)}catch(e){fail(id,e)}}
    }
    if(consumerApp&&(!checkFilters.length||checkFilters.includes('m23'))){try{await diagnostics(consumerApp);}catch(e){fail('M23 External consumer',e)}}
    if(!consumerApp&&(!checkFilters.length||checkFilters.includes('m23')))fail('M23 External consumer',new Error('Set MVP_CONSUMER_ROOT to the external consumer dist/analog/public directory to verify its production hydration.'));
  } catch(error) { fail('HARNESS',error); }
  finally { cdp?.close(); for(const p of servers){p.kill('SIGTERM');} await Promise.all(servers.map(p=>new Promise(resolve=>p.exitCode!==null?resolve():p.once('exit',resolve)))); if(chrome&&chrome.exitCode===null){chrome.kill('SIGTERM');const exited=await Promise.race([new Promise(r=>chrome.once('exit',()=>r(true))),delay(3000).then(()=>false)]);if(!exited)chrome.kill('SIGKILL');} if(temp)await rm(temp,{recursive:true,force:true}); if(fixturesPrepared){try{await restoreTocFixtures();console.log('Temporary TOC fixtures removed; Showcase A rebuilt without them.')}catch(e){fail('HARNESS cleanup',e)}} }
  const counts={PASS:results.filter(x=>x.status==='PASS').length,FAIL:results.filter(x=>x.status==='FAIL').length};
  console.log(`\nMVP browser summary: ${counts.PASS} PASS / ${counts.FAIL} FAIL`);
  if(counts.FAIL)process.exitCode=1;
}
main();
