/** Expectations for the Doq 0.1 presentation, slot and metadata check (`v01`). */
export interface V01Expectations {
  hostTitle: string;
  hostDescription: string;
  suffix: string;
  indexTitle: string;
  indexSlot: string;
  docSlot: string;
  /** A document without a `description`, reachable from the sidebar. */
  noDescriptionPath?: string;
}

export interface VerifiedApp {
  key: string;
  name: string;
  port: number;
  doc: string;
  nested: string;
  v01: V01Expectations | null;
  /** Absolute build output directory; defaults to the showcase's `dist/analog/public`. */
  distRoot?: string;
}

export interface Showcase extends VerifiedApp {
  key: 'a' | 'b';
  root: string;
  paths: string[];
  toc: boolean;
  side: 'left' | 'right';
  codePath: string;
  tocPath?: string;
}

export type Viewport = readonly [width: number, height: number];
