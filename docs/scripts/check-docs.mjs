import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MAINTAINED_DOCUMENTS = [
  'README.md',
  'AGENTS.md',
  'PROMPT.md',
  'FINAL_PROMPT_SWARM.md',
  'PLAN.md',
  'DEPLOY.md',
  'docs/README.md',
  'docs/applications.md',
  'docs/product-experience.md',
  'docs/verification.md',
  'docs/plan/01-codebase-map.md',
  'docs/plan/02-reference-analysis.md',
  'docs/plan/03-integration-blueprint.md',
  'docs/plan/04-twenty-native-law.md',
  'docs/templates/task.md',
  'docs/templates/handoff.md',
  'packages/twenty-apps/README-A2E.md',
  'packages/twenty-apps/internal/a2e-accounting/README.md',
];

export const checkMarkdown = (content, filePath, targetExists = existsSync) => {
  const errors = [];
  let localLinks = 0;
  let fence;

  for (const [index, line] of content.split('\n').entries()) {
    const marker = line.match(/^\s{0,3}(`{3,}|~{3,})(.*)$/);

    if (marker) {
      if (!fence) {
        fence = { marker: marker[1], line: index + 1 };
      } else if (
        marker[1][0] === fence.marker[0] &&
        marker[1].length >= fence.marker.length &&
        marker[2].trim() === ''
      ) {
        fence = undefined;
      }
      continue;
    }

    if (fence) continue;

    const prose = line.replace(/`+[^`]*`+/g, '');
    const links = prose.matchAll(/\[[^\]]*\]\((?:<([^>]+)>|([^\s)]+))(?:\s+"[^"]*")?\)/g);

    for (const match of links) {
      const target = match[1] ?? match[2];
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(target)) continue;

      const path = target.split(/[?#]/, 1)[0];
      if (!path) continue;
      localLinks += 1;

      try {
        if (!targetExists(resolve(dirname(filePath), decodeURIComponent(path)))) {
          errors.push(`${filePath}:${index + 1}: missing local target ${target}`);
        }
      } catch {
        errors.push(`${filePath}:${index + 1}: invalid local target ${target}`);
      }
    }
  }

  if (fence) {
    errors.push(`${filePath}:${fence.line}: unclosed code fence`);
  }

  return { errors, localLinks };
};

export const checkDocuments = (rootDirectory, documents = MAINTAINED_DOCUMENTS) => {
  const errors = [];
  let localLinks = 0;

  for (const document of documents) {
    const filePath = resolve(rootDirectory, document);
    try {
      const result = checkMarkdown(readFileSync(filePath, 'utf8'), filePath);
      errors.push(...result.errors);
      localLinks += result.localLinks;
    } catch {
      errors.push(`${document}: cannot read maintained document`);
    }
  }

  return { errors, localLinks, documents: documents.length };
};

const SCRIPT_PATH = fileURLToPath(import.meta.url);

if (process.argv[1] && resolve(process.argv[1]) === SCRIPT_PATH) {
  const result = checkDocuments(resolve(dirname(SCRIPT_PATH), '../..'));
  if (result.errors.length > 0) {
    console.error(result.errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.log(`PASS: ${result.documents} maintained documents, ${result.localLinks} local inline links, balanced code fences`);
  }
}
