import { defineDoqConfig } from '@doqs/analog';
import { doqPaths } from '../doq.paths';
import { EnterDemo } from './enter-demo';
import { InstallDemo } from './install-demo';

/** The official documentation: Doqs documenting itself, at /docs. */
export const doqConfig = defineDoqConfig({
  ...doqPaths,
  contentWidth: '46rem',
  search: { enabled: true },
  demos: { 'install-command': InstallDemo, 'enter-animation': EnterDemo },
  presentation: {
    documentationLabel: 'Doqs documentation',
    indexTitle: 'Doqs documentation',
    indexDescription: 'Install Doqs, connect it to an Analog application, write Markdown and ship searchable static documentation.',
    pageTitleSuffix: 'Doqs',
  },
});
