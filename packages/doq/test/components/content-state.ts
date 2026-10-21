export interface FakeDoc {
  /** Path below src/content/docs, without extension, for example "guides/install". */
  source: string;
  attributes?: Record<string, unknown>;
  body?: string;
  toc?: { id: string; text: string; level: number }[];
}

/** Test-controlled stand-in for Analog's build-time content glob (the only mocked boundary). */
export const contentState: { docs: FakeDoc[] } = { docs: [] };

export function fileList() {
  return contentState.docs.map((doc) => ({
    filename: `/project/src/content/docs/${doc.source}.md`,
    attributes: doc.attributes ?? {},
    slug: String(doc.attributes?.['slug'] ?? doc.source),
  }));
}

export function fileMap(): Record<string, () => Promise<string>> {
  return Object.fromEntries(
    contentState.docs.map((doc) => {
      const front = Object.entries(doc.attributes ?? {})
        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
        .join('\n');
      // Analog re-keys its loader map by the frontmatter slug, so mirror that.
      return [`/src/content/docs/${doc.attributes?.['slug'] ?? doc.source}.md`, async () => `---\n${front}\n---\n${doc.body ?? ''}`];
    }),
  );
}

