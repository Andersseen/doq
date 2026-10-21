/**
 * Spec-driven development helpers: pure functions so the rules are unit-testable.
 * A spec lives in docs/specs/<id>-<slug>/ and links requirements to acceptance cases, tasks and verification.
 * The checks cover structure and traceability only. They never prove that a feature works.
 */

export const SPEC_FILES = ['spec.md', 'design.md', 'tasks.md', 'verification.md'] as const;
export type SpecFile = (typeof SPEC_FILES)[number];

export const SPEC_ID = /^\d{4}$/;
export const SPEC_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SPEC_DIR = /^(\d{4})-([a-z0-9]+(?:-[a-z0-9]+)*)$/;
/** Test-case kinds map to the test layers documented in CONTRIBUTING.md. */
export const TEST_KINDS = ['UNIT', 'COMP', 'E2E', 'CONTRACT', 'SDD', 'MANUAL'] as const;

const REQUIRED_SPEC_SECTIONS = [
  'Problem',
  'Consumer impact',
  'Scope',
  'Non-goals',
  'Requirements',
  'Acceptance cases',
  'Public API impact',
  'Compatibility',
];
const REQUIRED_DESIGN_SECTIONS = ['Existing implementation', 'Proposed implementation', 'Tradeoffs and alternatives'];
const REQUIRED_VERIFICATION_SECTIONS = ['Test cases', 'Executed commands', 'Remaining limitations'];
const INCOMPLETE = /TODO\(sdd\)|\bTBD\b/;

export function validateSpecName(id: string, slug: string): string[] {
  const errors: string[] = [];
  if (!SPEC_ID.test(id)) errors.push(`milestone id "${id}" must be four digits, for example 0002`);
  if (!SPEC_SLUG.test(slug)) errors.push(`slug "${slug}" must be lowercase kebab-case, for example "search-index"`);
  return errors;
}

/** Content of the body under `## <heading>` up to the next level-2 heading, or undefined when absent. */
export function section(markdown: string, heading: string): string | undefined {
  const lines = markdown.split('\n');
  const start = lines.findIndex((line) => line.trim().toLowerCase() === `## ${heading}`.toLowerCase());
  if (start < 0) return undefined;
  const end = lines.findIndex((line, index) => index > start && /^##\s/.test(line));
  return lines
    .slice(start + 1, end < 0 ? undefined : end)
    .join('\n')
    .trim();
}

const withoutComments = (text: string) => text.replace(/<!--[\s\S]*?-->/g, '').trim();

function checkSections(file: string, markdown: string, headings: string[], errors: string[]) {
  for (const heading of headings) {
    const body = section(markdown, heading);
    if (body === undefined) errors.push(`${file}: missing section "## ${heading}"`);
    else if (!withoutComments(body)) errors.push(`${file}: section "## ${heading}" is empty`);
  }
  if (INCOMPLETE.test(markdown)) errors.push(`${file}: contains an unfinished marker (TODO(sdd) or TBD)`);
}

/** Every ID-looking token must be well formed (three digits) so typos cannot silently drop a reference. */
function checkMalformed(file: string, markdown: string, errors: string[]) {
  const kinds = ['REQ', 'AC', 'T', ...TEST_KINDS].join('|');
  for (const match of markdown.matchAll(new RegExp(`\\b(?:${kinds})-(\\d+)\\b`, 'g'))) {
    if (match[1]!.length !== 3) errors.push(`${file}: malformed identifier "${match[0]}" (use three digits)`);
  }
}

const ids = (text: string, prefix: string) =>
  [...text.matchAll(new RegExp(`\\b${prefix}-\\d{3}\\b`, 'g'))].map((m) => m[0]);

export interface Spec {
  name: string;
  files: Partial<Record<SpecFile, string>>;
}

export interface CheckOptions {
  /** True when a verification case identifier appears in a test source (default: always true). */
  testExists?: (testId: string) => boolean;
}

export function checkSpec(spec: Spec, options: CheckOptions = {}): string[] {
  const errors: string[] = [];
  const nameMatch = SPEC_DIR.exec(spec.name);
  if (!nameMatch) errors.push(`${spec.name}: directory must be named <four-digit id>-<kebab-slug>`);
  for (const file of SPEC_FILES) {
    if (spec.files[file] === undefined) errors.push(`${spec.name}: missing ${file}`);
  }
  const {
    'spec.md': specMd,
    'design.md': designMd,
    'tasks.md': tasksMd,
    'verification.md': verificationMd,
  } = spec.files;
  if (specMd === undefined || tasksMd === undefined || verificationMd === undefined) return errors;

  const file = (name: SpecFile) => `${spec.name}/${name}`;
  checkSections(file('spec.md'), specMd, REQUIRED_SPEC_SECTIONS, errors);
  if (designMd !== undefined) checkSections(file('design.md'), designMd, REQUIRED_DESIGN_SECTIONS, errors);
  checkSections(file('verification.md'), verificationMd, REQUIRED_VERIFICATION_SECTIONS, errors);
  if (!withoutComments(tasksMd)) errors.push(`${file('tasks.md')}: is empty`);
  if (INCOMPLETE.test(tasksMd)) errors.push(`${file('tasks.md')}: contains an unfinished marker (TODO(sdd) or TBD)`);
  for (const name of ['spec.md', 'tasks.md', 'verification.md'] as const)
    checkMalformed(file(name), spec.files[name]!, errors);

  // Requirements: unique IDs, defined only in "## Requirements".
  const requirementIds = ids(section(specMd, 'Requirements') ?? '', 'REQ');
  const duplicateRequirements = requirementIds.filter((id, i) => requirementIds.indexOf(id) !== i);
  for (const id of new Set(duplicateRequirements)) errors.push(`${file('spec.md')}: duplicate requirement ${id}`);
  if (!requirementIds.length) errors.push(`${file('spec.md')}: no requirement identifiers (REQ-001, ...) found`);
  const requirements = new Set(requirementIds);

  // Acceptance cases: "- **AC-001** [REQ-001, REQ-002] behavior".
  const acceptance = new Map<string, string[]>();
  for (const line of (section(specMd, 'Acceptance cases') ?? '').split('\n')) {
    const match = /^\s*[-*]\s+\*\*(AC-\d{3})\*\*\s*\[([^\]]*)\]/.exec(line);
    if (!match) {
      if (/\bAC-\d{3}\b/.test(line) && /^\s*[-*]/.test(line))
        errors.push(`${file('spec.md')}: acceptance line must look like "- **AC-001** [REQ-001] ...": ${line.trim()}`);
      continue;
    }
    const [, id, refs] = match as unknown as [string, string, string];
    if (acceptance.has(id)) errors.push(`${file('spec.md')}: duplicate acceptance case ${id}`);
    const referenced = ids(refs, 'REQ');
    if (!referenced.length) errors.push(`${file('spec.md')}: ${id} references no requirement`);
    for (const ref of referenced)
      if (!requirements.has(ref)) errors.push(`${file('spec.md')}: ${id} references unknown requirement ${ref}`);
    acceptance.set(id, referenced);
  }
  if (!acceptance.size) errors.push(`${file('spec.md')}: no acceptance cases found`);
  const covered = new Set([...acceptance.values()].flat());
  for (const id of requirements)
    if (!covered.has(id)) errors.push(`${file('spec.md')}: requirement ${id} has no acceptance case`);

  // Tasks: "- [ ] T-001 [REQ-001, AC-001] description".
  const taskRequirements = new Set<string>();
  for (const line of tasksMd.split('\n')) {
    const match = /^\s*[-*]\s+\[[ xX]\]\s+(T-\d{3})\s*\[([^\]]*)\]/.exec(line);
    if (!match) {
      if (/^\s*[-*]\s+\[[ xX]\]/.test(line))
        errors.push(`${file('tasks.md')}: task must look like "- [ ] T-001 [REQ-001, AC-001] ...": ${line.trim()}`);
      continue;
    }
    for (const ref of ids(match[2]!, 'REQ')) {
      if (!requirements.has(ref)) errors.push(`${file('tasks.md')}: ${match[1]} references unknown requirement ${ref}`);
      taskRequirements.add(ref);
    }
    for (const ref of ids(match[2]!, 'AC'))
      if (!acceptance.has(ref))
        errors.push(`${file('tasks.md')}: ${match[1]} references unknown acceptance case ${ref}`);
  }
  for (const id of requirements)
    if (!taskRequirements.has(id)) errors.push(`${file('tasks.md')}: requirement ${id} has no task`);

  // Verification table rows: "| UNIT-001 | AC-001, AC-002 | description | PASS |".
  const verified = new Set<string>();
  const cases = new Set<string>();
  const kindPattern = TEST_KINDS.join('|');
  for (const line of (section(verificationMd, 'Test cases') ?? '').split('\n')) {
    const match = new RegExp(
      `^\\|\\s*((?:${kindPattern})-\\d{3})\\s*\\|([^|]*)\\|([^|]*)\\|\\s*(PASS|FAIL|NOT RUN)\\s*\\|`,
    ).exec(line);
    if (!match) {
      if (new RegExp(`^\\|\\s*(?:${kindPattern})-`).test(line))
        errors.push(
          `${file('verification.md')}: malformed test-case row (needs id | acceptance | description | PASS/FAIL/NOT RUN): ${line.trim()}`,
        );
      continue;
    }
    const [, testId, refs] = match as unknown as [string, string, string];
    if (cases.has(testId)) errors.push(`${file('verification.md')}: duplicate test case ${testId}`);
    cases.add(testId);
    const referenced = ids(refs, 'AC');
    if (!referenced.length) errors.push(`${file('verification.md')}: ${testId} references no acceptance case`);
    for (const ref of referenced) {
      if (!acceptance.has(ref))
        errors.push(`${file('verification.md')}: ${testId} references unknown acceptance case ${ref}`);
      verified.add(ref);
    }
    if (options.testExists && !testId.startsWith('MANUAL-') && !options.testExists(testId)) {
      errors.push(`${file('verification.md')}: ${testId} does not appear in any test source`);
    }
  }
  for (const id of acceptance.keys())
    if (!verified.has(id)) errors.push(`${file('verification.md')}: acceptance case ${id} has no verification case`);
  return errors;
}

/** Fill a template: replaces {{key}} placeholders. */
export function render(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => values[key] ?? `{{${key}}}`);
}
