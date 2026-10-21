import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'forge-onboarding',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host { display: block; margin: 1.75rem 0 0; }
    ol { display: grid; grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr)); gap: .75rem; margin: 0; padding: 0; list-style: none; counter-reset: step; }
    li { counter-increment: step; padding: .9rem 1rem; border: 1px solid var(--host-docs-border); border-radius: 1rem; background: var(--host-docs-surface); }
    li::before { content: counter(step); display: inline-grid; place-items: center; width: 1.5rem; height: 1.5rem; margin-right: .5rem; border-radius: 50%; background: var(--host-docs-primary); color: var(--host-docs-background); font-size: .8rem; font-weight: 700; }
    a { color: var(--host-docs-primary); font-weight: 600; }
  `,
  template: `<section data-testid="forge-onboarding" aria-label="Onboarding path"><ol><li><a routerLink="/docs/onboarding/first-application">Create your first application</a></li><li><a routerLink="/docs/concepts/models">Model your content</a></li><li><a routerLink="/docs/reference/api">Call the delivery API</a></li></ol></section>`,
})
export class ForgeOnboardingComponent {}
