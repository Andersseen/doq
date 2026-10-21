import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'forge-token-note',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host { display: block; margin: 2.25rem 0 0; }
    p { margin: 0; padding: .9rem 1.1rem; border-radius: 1rem; background: var(--host-docs-surface); border: 1px dashed var(--host-docs-primary); color: var(--host-docs-secondary); font-size: .92rem; }
    strong { color: var(--host-docs-foreground); }
  `,
  template: `<p data-testid="forge-token-note" role="note"><strong>Need an API token?</strong> Create a scoped delivery token per environment in your ForgeCMS project settings.</p>`,
})
export class ForgeTokenNoteComponent {}
