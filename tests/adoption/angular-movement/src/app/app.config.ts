import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideFileRouter, withExtraRoutes } from '@analogjs/router';
import { provideContent, withMarkdownRenderer } from '@analogjs/content';
import { defineDoqConfig, doqRoutes, formatDoqUsage, provideDoq } from '@doqs/analog';
import { doqPaths } from '../doq.paths';
import { handbookDemos, HandbookMovementPlayground, HandbookSmoothScroll } from './handbook-demos';

const doqConfig = defineDoqConfig({
  ...doqPaths,
  search: { enabled: true },
  demos: handbookDemos,
  playgrounds: {
    'movement-enter': {
      component: HandbookMovementPlayground,
      title: 'moveEnter',
      description: 'The real Angular Movement directive. Every change replays the animation.',
      controls: [
        {
          input: 'preset',
          kind: 'select',
          label: 'Preset',
          initial: 'fade-up',
          options: ['fade-up', 'slide-left', 'zoom-in', 'blur-in'].map((value) => ({ label: value, value })),
        },
        { input: 'duration', kind: 'number', label: 'Duration (ms)', initial: 500, min: 100, max: 3000, step: 100 },
        { input: 'delay', kind: 'number', label: 'Delay (ms)', initial: 0, min: 0, max: 2000, step: 100 },
        {
          input: 'easing',
          kind: 'select',
          label: 'Easing',
          initial: 'ease-out',
          options: ['ease-out', 'ease-in-out', 'linear'].map((value) => ({ label: value, value })),
        },
        { input: 'disabled', kind: 'boolean', label: 'Disabled' },
      ],
      outputs: [{ event: 'played', label: 'Played' }],
      code: [
        {
          label: 'Template',
          language: 'html',
          code: ({ preset, duration, delay, easing, disabled }) =>
            formatDoqUsage(
              'div',
              {
                moveEnter: preset,
                moveDuration: duration,
                moveDelay: delay,
                moveEasing: easing,
                moveDisabled: disabled,
              },
              { text: 'Content' },
            ),
        },
      ],
    },
  },
  slots: { documentAfterContent: HandbookSmoothScroll },
  presentation: { documentationLabel: 'Handbook', pageTitleSuffix: 'Angular Movement' },
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideFileRouter(withExtraRoutes(doqRoutes(doqConfig))),
    provideContent(withMarkdownRenderer()),
    provideDoq(doqConfig),
    provideClientHydration(withEventReplay()),
  ],
};
