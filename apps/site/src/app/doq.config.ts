import { defineDoqConfig, formatDoqUsage } from '@doqs/analog';
import { doqPaths } from '../doq.paths';
import { EnterDemo } from './enter-demo';
import { InstallDemo } from './install-demo';
import { MovementPlaygroundComponent } from './movement-playground';

/** The official documentation: Doqs documenting itself, at /docs. */
export const doqConfig = defineDoqConfig({
  ...doqPaths,
  contentWidth: '46rem',
  search: { enabled: true },
  demos: { 'install-command': InstallDemo, 'enter-animation': EnterDemo },
  playgrounds: {
    'movement-enter': {
      component: MovementPlaygroundComponent,
      title: 'Angular Movement enter animation',
      description: 'Real moveEnter settings on a real element. Every change replays the animation.',
      controls: [
        { input: 'preset', kind: 'select', label: 'Preset', initial: 'fade-up', options: ['fade-up', 'slide-left', 'zoom-in', 'blur-in', 'bounce-in', 'flip-x'].map((value) => ({ label: value, value })) },
        { input: 'duration', kind: 'number', label: 'Duration (ms)', initial: 600, min: 100, max: 3000, step: 100 },
        { input: 'delay', kind: 'number', label: 'Delay (ms)', initial: 0, min: 0, max: 2000, step: 100 },
        { input: 'easing', kind: 'select', label: 'Easing', initial: 'ease-out', options: ['ease-out', 'ease-in-out', 'linear', 'cubic-bezier(0.34, 1.56, 0.64, 1)'].map((value) => ({ label: value, value })) },
        { input: 'disabled', kind: 'boolean', label: 'Disabled', description: 'Jumps straight to the end state, like reduced motion.' },
      ],
      outputs: [{ event: 'played', label: 'Played' }],
      code: [
        {
          label: 'Template',
          language: 'html',
          code: ({ preset, duration, delay, easing, disabled }) => formatDoqUsage('div', { moveEnter: preset, moveDuration: duration, moveDelay: delay, moveEasing: easing, moveDisabled: disabled }, { text: 'Content' }),
        },
      ],
    },
  },
  presentation: {
    documentationLabel: 'Doqs documentation',
    indexTitle: 'Doqs documentation',
    indexDescription: 'Install Doqs, connect it to an Analog application, write Markdown and ship searchable static documentation.',
    pageTitleSuffix: 'Doqs',
  },
});
