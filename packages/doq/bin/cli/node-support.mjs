// The Node.js range the Node-only tools support; it mirrors "engines" in package.json.
export const SUPPORTED_NODE = '^20.19.0, ^22.12.0 or >=24.0.0';

/** True for Node 20.19+, 22.12+ and 24+. */
export function isSupportedNode(version) {
  const [major = 0, minor = 0] = String(version).split('.').map(Number);
  return (major === 20 && minor >= 19) || (major === 22 && minor >= 12) || major >= 24;
}

/** Exits with code 2 and a one-line message when the running Node.js is outside the supported range. */
export function assertSupportedNode(tool, version = process.versions.node) {
  if (isSupportedNode(version)) return;
  console.error(`${tool}: Node.js ${version} is not supported. Use Node ${SUPPORTED_NODE}.`);
  process.exit(2);
}
