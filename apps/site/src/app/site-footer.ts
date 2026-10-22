import { ChangeDetectionStrategy, Component } from '@angular/core';
import { VoltNativeButton, VoltSeparator } from '@voltui/components';
import { LmnExternalLinkIcon } from 'lumen-icons/external-link';
import { siteLinks } from '../lib/site-config';

@Component({
  selector: 'app-site-footer',
  imports: [VoltNativeButton, VoltSeparator, LmnExternalLinkIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="mt-8 text-sm text-muted-foreground">
      <volt-separator />
      <div class="mx-auto flex w-[min(100%-2rem,70rem)] flex-wrap items-center justify-between gap-x-8 gap-y-3 py-8">
        <p class="m-0"><strong class="font-serif text-base text-foreground">doqs</strong> — documentation that lives in your Angular app.</p>
        <nav class="flex flex-wrap gap-1" aria-label="Footer">
          @for (link of items; track link.href) {
            <a voltButton variant="link" size="sm" [href]="link.href" rel="noopener">{{ link.label }}<lmn-external-link [size]="14" /></a>
          }
        </nav>
      </div>
    </footer>
  `,
})
export class SiteFooter {
  protected readonly items = [
    { label: 'GitHub', href: siteLinks.github },
    { label: 'npm', href: siteLinks.npm },
    { label: 'Documentation (README)', href: siteLinks.readme },
    { label: 'MIT License', href: siteLinks.license },
  ] as const;
}
