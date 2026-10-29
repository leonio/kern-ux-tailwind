/**
 * Writes src/tokens.css and src/remap.css from the installed
 * @kern-ux/native and tailwindcss. Run it after updating either; the
 * tailwind tests fail until the checked-in files match.
 *
 *   npm run tokens
 */
import { writeFileSync } from "node:fs";
import path from "node:path";

import { generateFiles, installedSources, SRC } from "./tokens.ts";

const sources = installedSources();
for (const [file, content] of Object.entries(generateFiles(sources))) {
	writeFileSync(path.join(SRC, file), content);
	console.log(`Wrote src/${file} from @kern-ux/native ${sources.kernVersion}`);
}
