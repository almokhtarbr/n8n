import { N8N_NODES_API_VERSION } from '@n8n/constants';

export { N8N_NODES_API_VERSION };

/** Minimal package.json shape needed to check node API compatibility. */
export interface NodesApiVersionPackageJson {
	n8n?: {
		/**
		 * Node-authoring API level the package requires, as `"<major>"` or
		 * `"<major>.<minor>"`. An integer means `<major>.0`. Absent in legacy
		 * packages, which require level 1.
		 */
		n8nNodesApiVersion?: unknown;
	};
}

/** A node-authoring API level, split into major and minor. */
export type NodesApiLevel = [major: number, minor: number];

export type NodesApiVersionCheck =
	| { compatible: true }
	| {
			compatible: false;
			reason: 'malformed';
			/** The declared value, as read from package.json. */
			declared: unknown;
	  }
	| {
			compatible: false;
			reason: 'unsupported';
			/** The declared value, as read from package.json. */
			declared: unknown;
			/** The declared level, normalized to `<major>.<minor>` for messages and metadata. */
			required: string;
	  };

const LEVEL_PATTERN = /^(\d+)(?:\.(\d+))?$/;

/**
 * Parses a declared node API level into `[major, minor]`, or `null` when the
 * value is not a level.
 *
 * Levels are compared as `[major, minor]`, never as decimal numbers. A number
 * is valid only as an integer (`3` means `3.0`). A minor level must be a
 * string, because an unquoted `3.10` in package.json is read as `3.1`, and
 * `3.9` is read as greater than `3.10`. A number with a decimal point is
 * therefore rejected, not guessed at.
 */
export function parseNodesApiLevel(value: unknown): NodesApiLevel | null {
	if (typeof value === 'number') {
		return Number.isInteger(value) && value >= 1 ? [value, 0] : null;
	}

	if (typeof value !== 'string') return null;

	const match = LEVEL_PATTERN.exec(value.trim());
	if (!match) return null;

	const major = Number(match[1]);
	if (major < 1) return null;

	return [major, match[2] === undefined ? 0 : Number(match[2])];
}

/** Renders a level as `<major>.<minor>`, so `3`, `" 3.0 "` and `"03.0"` all read as `3.0`. */
function formatLevel([major, minor]: NodesApiLevel): string {
	return `${major}.${minor}`;
}

/** Whether `[major, minor]` is at most `[maxMajor, maxMinor]`. */
function isAtMost([major, minor]: NodesApiLevel, [maxMajor, maxMinor]: NodesApiLevel): boolean {
	return major < maxMajor || (major === maxMajor && minor <= maxMinor);
}

// A malformed constant would be a build-time mistake; the unit test asserts it
// parses, so the fallback can never silently downgrade the supported level.
const SUPPORTED_LEVEL: NodesApiLevel = parseNodesApiLevel(N8N_NODES_API_VERSION) ?? [1, 0];

/**
 * Read a community package's declared node-authoring API level and check it
 * against the level this runtime supports (`required <= N8N_NODES_API_VERSION`,
 * compared major first and then minor).
 *
 * Missing `n8n.n8nNodesApiVersion` means a legacy package and resolves to
 * level 1. Malformed values are reported as incompatible — the runtime cannot
 * distinguish an old package from a corrupt or hostile one if both fall back
 * to legacy.
 */
export function checkNodesApiVersion(pkgJson: NodesApiVersionPackageJson): NodesApiVersionCheck {
	const declared = pkgJson?.n8n?.n8nNodesApiVersion;

	if (declared === undefined) return { compatible: true };

	const required = parseNodesApiLevel(declared);
	if (required === null) return { compatible: false, reason: 'malformed', declared };

	if (isAtMost(required, SUPPORTED_LEVEL)) return { compatible: true };

	return { compatible: false, reason: 'unsupported', declared, required: formatLevel(required) };
}
