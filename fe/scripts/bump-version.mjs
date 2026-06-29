import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const VERSION_FILES = ['package.json', 'package-lock.json'];
const BUMP_ALIASES = {
  bug: 'patch',
  bugfix: 'patch',
  fix: 'patch',
  patch: 'patch',
  feature: 'minor',
  minor: 'minor',
  major: 'major',
};

function parseVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);

  if (!match) {
    throw new Error(`Invalid semver version "${version}". Expected x.y.z.`);
  }

  return match.slice(1).map(Number);
}

function bumpVersion(version, bumpType) {
  const [major, minor, patch] = parseVersion(version);

  if (bumpType === 'major') {
    return `${major + 1}.0.0`;
  }

  if (bumpType === 'minor') {
    return `${major}.${minor + 1}.0`;
  }

  return `${major}.${minor}.${patch + 1}`;
}

function resolveNextVersion(currentVersion, input) {
  const normalizedInput = input?.trim().toLowerCase();

  if (!normalizedInput) {
    throw new Error('Usage: npm run version:bug | npm run version:feature | npm run version:major');
  }

  if (/^\d+\.\d+\.\d+$/.test(normalizedInput)) {
    return normalizedInput;
  }

  const bumpType = BUMP_ALIASES[normalizedInput];

  if (!bumpType) {
    throw new Error(`Unknown version bump "${input}". Use bug, feature, major, or an explicit x.y.z version.`);
  }

  return bumpVersion(currentVersion, bumpType);
}

function updateVersionFields(fileName, data, nextVersion) {
  data.version = nextVersion;

  if (fileName === 'package-lock.json' && data.packages?.['']) {
    data.packages[''].version = nextVersion;
  }
}

const packageRoot = process.cwd();
const packageJsonPath = path.join(packageRoot, 'package.json');
const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
const nextVersion = resolveNextVersion(packageJson.version, process.argv[2]);

for (const fileName of VERSION_FILES) {
  const filePath = path.join(packageRoot, fileName);
  const data = JSON.parse(await readFile(filePath, 'utf8'));

  updateVersionFields(fileName, data, nextVersion);
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

console.log(`Version bumped to ${nextVersion}`);
