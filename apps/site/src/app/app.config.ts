import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideFileRouter } from '@analogjs/router';
import { provideVoltTheme } from '@voltui/components';
import { readInitialDark } from './theme';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideFileRouter(),
    provideClientHydration(withEventReplay()),
    provideVoltTheme({ color: 'ember', style: 'soft', dark: readInitialDark() }),
  ],
};
