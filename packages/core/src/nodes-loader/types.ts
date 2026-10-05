export namespace n8n {
	export interface PackageJson {
		name: string;
		version: string;
		n8n?: {
			credentials?: string[];
			nodes?: string[];
			/**
			 * Raw value from package.json: an integer (`3` means `3.0`), `"<major>"` or
			 * `"<major>.<minor>"`. Parse it with `parseNodesApiLevel` before use.
			 */
			n8nNodesApiVersion?: number | string;
		};
		author?: {
			name?: string;
			email?: string;
		};
	}
}
