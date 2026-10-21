import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'vanta-start',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host { display: block; margin: 1.75rem 0 0; }
    .start { display: flex; flex-wrap: wrap; align-items: center; gap: .75rem 1.25rem; padding: 1rem 1.25rem; border: 1px solid var(--host-docs-border); border-left: 3px solid var(--host-docs-primary); border-radius: .75rem; background: var(--host-docs-surface); }
    code { padding: .3rem .6rem; border-radius: .4rem; background: var(--host-docs-code-background); color: var(--host-docs-code-foreground); }
    a { margin-left: auto; color: var(--host-docs-primary); font-weight: 600; }
  `,
  template: `<aside class="start" data-testid="vanta-start" aria-label="Quick start"><strong>New to Vanta UI?</strong><code>pnpm add vanta-ui</code><a routerLink="/docs/installation">Follow the install guide →</a></aside>`,
})
export class VantaStartComponent {}
