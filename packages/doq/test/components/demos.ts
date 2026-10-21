import { Component } from '@angular/core';

@Component({ selector: 'host-demo', template: '<button type="button">Host demo control</button>' })
export class HostDemoComponent {}

@Component({ selector: 'host-slot', template: '<p>Host composition slot</p>' })
export class HostSlotComponent {}

@Component({ selector: 'host-doc-slot', template: '<p>After every document</p>' })
export class HostDocSlotComponent {}
