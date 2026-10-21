import { DestroyRef, inject, Injectable, makeStateKey, PLATFORM_ID, TransferState } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';

type HostMetadata = { title: string; description: string | null };
// The server captures the host's own metadata before Doq changes it; hydration consumes it once so the
// client can restore the host values instead of the already-updated document head.
const HOST_METADATA = makeStateKey<HostMetadata>('doq-host-metadata');

/**
 * Scoped title/description updates: the host's values are captured when the first Doq page becomes
 * active and restored when the last one is destroyed, so metadata never leaks into other routes
 * or lingers from a previous document.
 */
@Injectable({ providedIn: 'root' })
export class DoqPageMetadata {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private owners = 0;
  private readonly transferState = inject(TransferState);
  private readonly server = isPlatformServer(inject(PLATFORM_ID));
  private original?: HostMetadata;

  /** Register the calling component for the lifetime of its injector. */
  claim(destroyRef: DestroyRef): void {
    if (this.owners++ === 0) {
      const transferred = this.server ? null : this.transferState.get(HOST_METADATA, null);
      this.original = transferred ?? { title: this.title.getTitle(), description: this.meta.getTag('name="description"')?.content ?? null };
      if (this.server) this.transferState.set(HOST_METADATA, this.original);
      else this.transferState.remove(HOST_METADATA);
    }
    destroyRef.onDestroy(() => {
      if (--this.owners === 0 && this.original) {
        this.title.setTitle(this.original.title);
        this.writeDescription(this.original.description);
        this.original = undefined;
      }
    });
  }

  /** Set the page title; a missing description reverts to the host's own description. */
  set(title: string, description?: string): void {
    this.title.setTitle(title);
    this.writeDescription(description || this.original?.description || null);
  }

  private writeDescription(content: string | null): void {
    if (content) this.meta.updateTag({ name: 'description', content });
    else this.meta.removeTag('name="description"');
  }
}

export function doqPageTitle(title: string, suffix: string): string {
  return suffix ? `${title} · ${suffix}` : title;
}
