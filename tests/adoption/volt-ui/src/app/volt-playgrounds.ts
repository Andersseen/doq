import { ChangeDetectionStrategy, Component, input, model, output, signal } from '@angular/core';
import {
  VoltButton,
  VoltDialogContent,
  VoltDialogDescription,
  VoltDialogOverlay,
  VoltDialogRoot,
  VoltDialogTitle,
  VoltNativeButton,
  VoltPopoverContent,
  VoltPopoverTrigger,
  VoltSelect,
  VoltSelectContent,
  VoltSelectItem,
} from 'volt';

/** Doqs playground targets for REAL Volt UI components. They are host-owned: Doqs binds inputs and observes outputs by name. */

@Component({
  selector: 'app-volt-button-playground',
  imports: [VoltButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <volt-button
      [variant]="variant()"
      [size]="size()"
      [disabled]="disabled()"
      (click)="pressed.emit({ label: label() })"
      >{{ label() }}</volt-button
    >
  `,
})
export class VoltButtonPlayground {
  readonly variant = input<'solid' | 'outline' | 'ghost' | 'link' | 'destructive'>('solid');
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly disabled = input(false);
  readonly label = input('Save changes');
  readonly pressed = output<{ label: string }>();
}

@Component({
  selector: 'app-volt-dialog-playground',
  imports: [
    VoltNativeButton,
    VoltDialogRoot,
    VoltDialogOverlay,
    VoltDialogContent,
    VoltDialogTitle,
    VoltDialogDescription,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button voltButton type="button" (click)="open.set(true)">Open dialog</button>
    <ng-template
      voltDialogRoot
      [(open)]="open"
      [role]="role()"
      [closeOnEscape]="closeOnEscape()"
      (closed)="closed.emit($event)"
      let-close="close"
    >
      <div voltDialogOverlay class="fixed inset-0 z-50 bg-black/50"></div>
      <div
        voltDialogContent
        class="fixed top-1/2 left-1/2 z-50 w-96 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-6 shadow-lg"
      >
        <h2 voltDialogTitle class="text-lg font-semibold">{{ heading() }}</h2>
        <p voltDialogDescription class="mt-2 text-sm text-muted-foreground">
          This is a real Volt UI dialog opened from a Doqs playground.
        </p>
        <div class="mt-4 flex gap-2">
          <button voltButton type="button" (click)="close('confirmed')">Confirm</button>
          <button voltButton type="button" variant="outline" (click)="close('cancelled')">Cancel</button>
        </div>
      </div>
    </ng-template>
  `,
})
export class VoltDialogPlayground {
  readonly heading = input('Delete project?');
  readonly role = input<'dialog' | 'alertdialog'>('dialog');
  readonly closeOnEscape = input(true);
  readonly open = model(false);
  readonly closed = output<unknown>();
}

@Component({
  selector: 'app-volt-popover-playground',
  imports: [VoltNativeButton, VoltPopoverTrigger, VoltPopoverContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      voltButton
      type="button"
      variant="outline"
      [voltPopover]="details"
      [placement]="placement()"
      [offset]="offset()"
      (openChange)="openChange.emit($event)"
    >
      Show details
    </button>
    <ng-template #details>
      <volt-popover-content>
        <p class="text-sm font-medium">Dimensions</p>
        <p class="mt-1 text-sm text-muted-foreground">Set the width and height of the layer.</p>
      </volt-popover-content>
    </ng-template>
  `,
})
export class VoltPopoverPlayground {
  readonly placement = input<'top' | 'bottom' | 'left' | 'right'>('bottom');
  readonly offset = input(8);
  readonly openChange = output<boolean>();
}

@Component({
  selector: 'app-volt-select-playground',
  imports: [VoltSelect, VoltSelectContent, VoltSelectItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="w-64">
      <volt-select
        [value]="value()"
        (valueChange)="value.set($any($event)); changed.emit($any($event))"
        [placeholder]="placeholder()"
        [disabled]="disabled()"
        aria-label="Fruit"
      >
        <volt-select-content>
          <volt-select-item value="apple">Apple</volt-select-item>
          <volt-select-item value="banana">Banana</volt-select-item>
          <volt-select-item value="grapes">Grapes</volt-select-item>
        </volt-select-content>
      </volt-select>
    </div>
  `,
})
export class VoltSelectPlayground {
  readonly placeholder = input('Select a fruit');
  readonly disabled = input(false);
  protected readonly value = signal<unknown>(undefined);
  readonly changed = output<string>();
}
