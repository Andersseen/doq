// Minimal semver range support for the peer ranges Doqs publishes: `^`, `~`, `>=`, exact versions, `x` and `||`.
// Pre-release tags are ignored (1.2.3-rc.1 is compared as 1.2.3).

/** @returns {[number, number, number] | undefined} */
export function parseVersion(text) {
  const match = /^\s*v?(\d+)(?:\.(\d+|x|\*))?(?:\.(\d+|x|\*))?/i.exec(String(text));
  if (!match) return undefined;
  const part = value => (value === undefined || value === 'x' || value === '*' || value === 'X' ? 0 : Number(value));
  return [Number(match[1]), part(match[2]), part(match[3])];
}

const compare = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

function satisfiesComparator(version, comparator) {
  const operator = /^(\^|~|>=|>|<=|<|=)?\s*(.*)$/.exec(comparator.trim());
  const base = parseVersion(operator[2]);
  if (!base) return undefined;
  const wildcard = /^\d+(\.(x|\*))?$|^\d+\.\d+\.(x|\*)$/i.test(operator[2].trim());
  switch (operator[1]) {
    case '^': {
      const upper = base[0] > 0 ? [base[0] + 1, 0, 0] : base[1] > 0 ? [0, base[1] + 1, 0] : [0, 0, base[2] + 1];
      return compare(version, base) >= 0 && compare(version, upper) < 0;
    }
    case '~':
      return compare(version, base) >= 0 && compare(version, [base[0], base[1] + 1, 0]) < 0;
    case '>=':
      return compare(version, base) >= 0;
    case '>':
      return compare(version, base) > 0;
    case '<=':
      return compare(version, base) <= 0;
    case '<':
      return compare(version, base) < 0;
    default:
      if (wildcard) return version[0] === base[0] && (/^\d+$/.test(operator[2].trim()) || version[1] === base[1]);
      return compare(version, base) === 0;
  }
}

/** True/false when the range can be evaluated, `undefined` when it uses syntax this helper does not understand. */
export function satisfies(versionText, range) {
  const version = parseVersion(versionText);
  if (!version) return undefined;
  let understood = true;
  const ok = String(range)
    .split('||')
    .some(set =>
      set
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .every(comparator => {
          const result = satisfiesComparator(version, comparator);
          if (result === undefined) understood = false;
          return result;
        }),
    );
  return ok ? true : understood ? false : undefined;
}
