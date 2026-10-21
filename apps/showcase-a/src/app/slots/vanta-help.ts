import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'vanta-help',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host { display: block; margin: 2.5rem 0 0; }
    .help { display: flex; flex-wrap: wrap; gap: .5rem 1.25rem; padding-top: 1rem; border-top: 1px solid var(--host-docs-border); color: var(--host-docs-muted); font-size: .9rem; }
    a { color: var(--host-docs-primary); }
  `,
  template: `<aside class="help" data-testid="vanta-help" aria-label="Help"><span>Spotted a gap in these docs?</span><a href="https://github.com" target="_blank" rel="noreferrer">Suggest an edit ↗</a><a href="https://github.com" target="_blank" rel="noreferrer">Ask the community ↗</a></aside>`,
})
export class VantaHelpComponent {}
