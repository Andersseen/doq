import { ChangeDetectionStrategy, Component, forwardRef, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface DoqNavigationNode {
  key: string;
  label: string;
  href?: string;
  containsActive?: boolean;
  children?: DoqNavigationNode[];
}

@Component({
  selector: 'doq-nav-tree',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, forwardRef(() => DoqNavigationTreeComponent)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="doq-nav-tree">
      @for (node of nodes(); track node.key) {
        <li>
          @if (node.href) {
            <a class="doq-nav-link" [routerLink]="node.href" routerLinkActive="is-active" [routerLinkActiveOptions]="{ exact: true }" (click)="navigate.emit()">{{ node.label }}</a>
          } @else {
            <details class="doq-nav-group" [open]="node.containsActive">
              <summary>{{ node.label }}</summary>
              <doq-nav-tree [nodes]="node.children ?? []" (navigate)="navigate.emit()" />
            </details>
          }
        </li>
      }
    </ul>
  `,
})
export class DoqNavigationTreeComponent {
  readonly nodes = input.required<DoqNavigationNode[]>();
  readonly navigate = output<void>();
}
