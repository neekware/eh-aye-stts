#!/usr/bin/env node
import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join, extname } from 'path';

interface FileStats {
  files: number;
  lines: number;
  blanks: number;
  comments: number;
  code: number;
}

interface LanguageStats {
  [key: string]: FileStats;
}

const EXTENSIONS_MAP: { [key: string]: string } = {
  // JavaScript/TypeScript ecosystem
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript',
  '.js': 'JavaScript',
  '.jsx': 'JavaScript',
  '.mjs': 'JavaScript',
  '.cjs': 'JavaScript',
  '.d.ts': 'TypeScript',

  // Configuration files
  '.json': 'JSON',
  '.jsonc': 'JSON',
  '.json5': 'JSON',
  '.yml': 'YAML',
  '.yaml': 'YAML',
  '.toml': 'TOML',
  '.ini': 'INI',
  '.env': 'Environment',
  '.env.example': 'Environment',
  '.env.local': 'Environment',
  '.env.production': 'Environment',
  '.env.development': 'Environment',
  '.env.test': 'Environment',

  // Documentation
  '.md': 'Markdown',
  '.mdx': 'Markdown',
  '.rst': 'reStructuredText',
  '.txt': 'Text',
  '.adoc': 'AsciiDoc',

  // Web technologies
  '.html': 'HTML',
  '.htm': 'HTML',
  '.css': 'CSS',
  '.scss': 'SCSS',
  '.sass': 'Sass',
  '.less': 'Less',
  '.styl': 'Stylus',
  '.vue': 'Vue',
  '.svelte': 'Svelte',

  // Programming languages
  '.py': 'Python',
  '.pyi': 'Python',
  '.pyx': 'Python',
  '.ipynb': 'Jupyter',
  '.java': 'Java',
  '.kt': 'Kotlin',
  '.kts': 'Kotlin',
  '.scala': 'Scala',
  '.go': 'Go',
  '.rs': 'Rust',
  '.c': 'C',
  '.cpp': 'C++',
  '.cc': 'C++',
  '.cxx': 'C++',
  '.h': 'C/C++ Header',
  '.hpp': 'C++ Header',
  '.cs': 'C#',
  '.fs': 'F#',
  '.swift': 'Swift',
  '.m': 'Objective-C',
  '.mm': 'Objective-C++',
  '.php': 'PHP',
  '.rb': 'Ruby',
  '.rake': 'Ruby',
  '.lua': 'Lua',
  '.r': 'R',
  '.R': 'R',
  '.jl': 'Julia',
  '.dart': 'Dart',
  '.elm': 'Elm',
  '.ex': 'Elixir',
  '.exs': 'Elixir',
  '.erl': 'Erlang',
  '.hrl': 'Erlang',
  '.clj': 'Clojure',
  '.cljs': 'ClojureScript',
  '.cljc': 'Clojure',
  '.hs': 'Haskell',
  '.lhs': 'Haskell',
  '.ml': 'OCaml',
  '.mli': 'OCaml',
  '.nim': 'Nim',
  '.nims': 'Nim',
  '.cr': 'Crystal',
  '.zig': 'Zig',
  '.v': 'V',
  '.vsh': 'V',

  // Shell and scripts
  '.sh': 'Shell',
  '.bash': 'Shell',
  '.zsh': 'Shell',
  '.fish': 'Shell',
  '.ps1': 'PowerShell',
  '.psm1': 'PowerShell',
  '.psd1': 'PowerShell',
  '.bat': 'Batch',
  '.cmd': 'Batch',
  '.awk': 'AWK',
  '.sed': 'Sed',

  // Build and config files
  '.makefile': 'Makefile',
  '.mk': 'Makefile',
  '.cmake': 'CMake',
  '.gradle': 'Gradle',
  '.gradle.kts': 'Gradle',
  '.sbt': 'SBT',
  '.bazel': 'Bazel',
  '.bzl': 'Bazel',

  // Docker and containers
  '.dockerfile': 'Dockerfile',
  '.containerfile': 'Dockerfile',

  // Git
  '.gitignore': 'Git',
  '.gitattributes': 'Git',
  '.gitmodules': 'Git',

  // CI/CD
  '.travis.yml': 'CI/CD',
  '.circleci': 'CI/CD',
  '.gitlab-ci.yml': 'CI/CD',
  '.github': 'CI/CD',

  // SQL
  '.sql': 'SQL',
  '.psql': 'SQL',
  '.mysql': 'SQL',
  '.sqlite': 'SQL',

  // Data formats
  '.xml': 'XML',
  '.svg': 'SVG',
  '.csv': 'CSV',
  '.tsv': 'TSV',

  // Template files
  '.ejs': 'EJS',
  '.pug': 'Pug',
  '.jade': 'Jade',
  '.hbs': 'Handlebars',
  '.handlebars': 'Handlebars',
  '.mustache': 'Mustache',
  '.njk': 'Nunjucks',
  '.liquid': 'Liquid',

  // Other
  '.proto': 'Protocol Buffers',
  '.graphql': 'GraphQL',
  '.gql': 'GraphQL',
  '.prisma': 'Prisma',
  '.vim': 'VimScript',
  '.vimrc': 'VimScript',
  '.tmux': 'Tmux',
  '.editorconfig': 'EditorConfig',
  '.prettierrc': 'Config',
  '.eslintrc': 'Config',
  '.babelrc': 'Config',

  // Lock files (usually want to exclude, but counting for completeness)
  '.lock': 'Lock',

  // License and legal
  '.license': 'License',
  '.LICENSE': 'License',

  // No extension files
  Dockerfile: 'Dockerfile',
  Makefile: 'Makefile',
  Rakefile: 'Ruby',
  Gemfile: 'Ruby',
  Pipfile: 'Python',
  Procfile: 'Procfile',
  Vagrantfile: 'Ruby',
  LICENSE: 'License',
  README: 'Text',
  CHANGELOG: 'Text',
  AUTHORS: 'Text',
  CONTRIBUTORS: 'Text',
  TODO: 'Text',
  INSTALL: 'Text',
  NOTICE: 'Text',
};

const EXCLUDE_DIRS = [
  'node_modules',
  'dist',
  'coverage',
  '.git',
  '.husky',
  'tmp',
  'temp',
  '.cache',
];

const EXCLUDE_FILES = [
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  '.DS_Store',
  'Thumbs.db',
  '*.log',
  '*.map',
  '*.min.js',
  '*.min.css',
];

function isExcluded(path: string): boolean {
  const parts = path.split('/');
  const filename = parts[parts.length - 1];

  // Check if any part of the path matches excluded directories
  if (EXCLUDE_DIRS.some((dir) => parts.includes(dir))) {
    return true;
  }

  // Check excluded files
  for (const pattern of EXCLUDE_FILES) {
    if (pattern.includes('*')) {
      // Simple glob pattern matching
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      if (regex.test(filename)) {
        return true;
      }
    } else if (filename === pattern) {
      return true;
    }
  }

  return false;
}

function countLines(
  content: string,
  filePath: string
): { total: number; blanks: number; comments: number } {
  const lines = content.split('\n');
  let blanks = 0;
  let comments = 0;
  let inBlockComment = false;
  const ext = extname(filePath);

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      blanks++;
      return;
    }

    // Handle block comments
    if (inBlockComment) {
      comments++;
      if (trimmed.includes('*/') || trimmed.includes('"""') || trimmed.includes("'''")) {
        inBlockComment = false;
      }
      return;
    }

    // Check for block comment start
    if (trimmed.startsWith('/*') || trimmed.startsWith('"""') || trimmed.startsWith("'''")) {
      comments++;
      inBlockComment = true;
      if (
        trimmed.includes('*/') ||
        (trimmed.match(/"""/g) || []).length >= 2 ||
        (trimmed.match(/'''/g) || []).length >= 2
      ) {
        inBlockComment = false;
      }
      return;
    }

    // Single line comments by language
    const commentPatterns = [
      // C-style comments
      '//',

      // Shell, Python, Ruby, YAML, etc.
      '#',

      // SQL, Lua
      '--',

      // Batch files
      'REM ',
      '::',

      // Vim
      '"',

      // Lisp-like languages
      ';',

      // Fortran
      '!',

      // Matlab
      '%',
    ];

    // Special handling for some formats
    if (trimmed.startsWith('*') && (ext === '.md' || ext === '.rst')) {
      // Don't count markdown bullets as comments
    } else if (commentPatterns.some((pattern) => trimmed.startsWith(pattern))) {
      comments++;
    } else if (
      trimmed.startsWith('*') &&
      (ext === '.js' || ext === '.ts' || ext === '.java' || ext === '.c' || ext === '.cpp')
    ) {
      // Likely a continuation of a block comment
      comments++;
    }
  });

  return {
    total: lines.length,
    blanks,
    comments,
  };
}

function processFile(filePath: string, stats: LanguageStats): void {
  if (isExcluded(filePath)) return;

  const ext = extname(filePath);
  const filename = filePath.split('/').pop() || '';

  // First check for files without extensions
  let language = EXTENSIONS_MAP[filename];

  // If not found, check by extension
  if (!language && ext) {
    language = EXTENSIONS_MAP[ext];
  }

  if (!language) return;

  try {
    const content = readFileSync(filePath, 'utf-8');
    const { total, blanks, comments } = countLines(content, filePath);

    if (!stats[language]) {
      stats[language] = { files: 0, lines: 0, blanks: 0, comments: 0, code: 0 };
    }

    stats[language].files++;
    stats[language].lines += total;
    stats[language].blanks += blanks;
    stats[language].comments += comments;
    stats[language].code += total - blanks - comments;
  } catch (error) {
    // Skip files that can't be read
  }
}

function walkDirectory(dir: string, stats: LanguageStats): void {
  if (isExcluded(dir)) return;

  try {
    const entries = readdirSync(dir);

    entries.forEach((entry) => {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        walkDirectory(fullPath, stats);
      } else if (stat.isFile()) {
        processFile(fullPath, stats);
      }
    });
  } catch (error) {
    // Skip directories that can't be read
  }
}

function generateMarkdownTable(stats: LanguageStats): string {
  const languages = Object.keys(stats).sort();
  let table = '| Language | Files | Lines | Code | Comments | Blanks |\n';
  table += '|----------|-------|-------|------|----------|--------|\n';

  let totalFiles = 0;
  let totalLines = 0;
  let totalCode = 0;
  let totalComments = 0;
  let totalBlanks = 0;

  languages.forEach((lang) => {
    const { files, lines, code, comments, blanks } = stats[lang];
    table += `| ${lang} | ${files} | ${lines} | ${code} | ${comments} | ${blanks} |\n`;

    totalFiles += files;
    totalLines += lines;
    totalCode += code;
    totalComments += comments;
    totalBlanks += blanks;
  });

  table += `| **Total** | **${totalFiles}** | **${totalLines}** | **${totalCode}** | **${totalComments}** | **${totalBlanks}** |\n`;

  return table;
}

function updateReadme(stats: LanguageStats): void {
  const readmePath = join(process.cwd(), 'README.md');
  let readme = readFileSync(readmePath, 'utf-8');

  const table = generateMarkdownTable(stats);
  const locSection = `## 📊 Lines of Code

${table}

*Last updated: ${new Date().toISOString().split('T')[0]}*`;

  // Check if LOC section exists
  const locRegex = /## 📊 Lines of Code[\s\S]*?(?=\n##|$)/;
  if (locRegex.test(readme)) {
    // Replace existing section
    readme = readme.replace(locRegex, locSection);
  } else {
    // Add before the Examples section
    const examplesIndex = readme.indexOf('## Examples');
    if (examplesIndex !== -1) {
      readme = readme.slice(0, examplesIndex) + locSection + '\n\n' + readme.slice(examplesIndex);
    } else {
      // Add before Documentation section
      const docsIndex = readme.indexOf('## Documentation');
      if (docsIndex !== -1) {
        readme = readme.slice(0, docsIndex) + locSection + '\n\n' + readme.slice(docsIndex);
      }
    }
  }

  writeFileSync(readmePath, readme);
  console.log('✅ README.md updated with lines of code statistics');
}

// Main execution
function main(): void {
  const stats: LanguageStats = {};
  const rootDir = process.cwd();

  console.log('📊 Counting lines of code...');
  walkDirectory(rootDir, stats);

  // Generate summary
  console.log('\n📈 Summary:');
  Object.entries(stats).forEach(([lang, { files, lines, code }]) => {
    console.log(`  ${lang}: ${files} files, ${lines} lines (${code} code)`);
  });

  // Update README
  updateReadme(stats);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
