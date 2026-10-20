# @getdoq/analog

Experimental Angular documentation components and routing integration for Analog.js. This package is a pilot and is not published to npm.

## Requirements

Verified with Node 22.23.1, Analog 2.9, Angular 21.2, TypeScript 5.9, and Vite 8.3. Angular 22 is included in the declared peer range but has not been validated in this pilot.

Peer dependencies: `@analogjs/content`, `@angular/common`, `@angular/core`, `@angular/platform-browser`, `@angular/router`, and RxJS.

## Setup

Install this tarball in an Analog app, along with `@analogjs/content` and `@analogjs/router`. Add these providers in the app configuration:

```ts
import { provideContent, withMarkdownRenderer } from '@analogjs/content';
import { provideFileRouter, withExtraRoutes } from '@analogjs/router';
import { doqRoutes, provideDoq } from '@getdoq/analog';

const doqConfig = {
  contentDirectory: 'docs',
  basePath: '/docs',
  routeParam: 'slug',
  sidebar: 'left' as const,
  showTableOfContents: true,
};

provideFileRouter(withExtraRoutes(doqRoutes(doqConfig)));
provideContent(withMarkdownRenderer());
provideDoq(doqConfig);
```

Import `@getdoq/analog/styles.css` once in the application's global stylesheet. Keep the host's header and footer around `<router-outlet>`.

Markdown lives under `src/content/docs`. Nested source paths become nested routes. Supported metadata fields are `title`, `description`, `group`, `order`, `slug`, and `demo`. Custom `slug` overrides are listed in navigation but content lookup still follows the source filename; avoid overrides until that limitation is fixed.

Consumer demos are standalone Angular components registered by ID in `DoqConfig.demos` and referenced using `demo: <id>` frontmatter. Doq uses `NgComponentOutlet` and does not compile arbitrary Angular templates from Markdown. Components load eagerly in this pilot.

Analog prerendering remains a consumer responsibility. Add every desired docs URL to the Analog prerender route list. See the repository README for host theming, workspace commands, and full pilot limitations.
