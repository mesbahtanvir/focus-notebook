'use strict';

/**
 * Codex GitHub PR Review
 *
 * Fetches the pull request diff, sends it to OpenAI Codex (via chat completion),
 * and posts or updates a PR comment with the review results.
 */

const DEFAULT_MODEL = process.env.OPENAI_CODEREVIEW_MODEL || 'gpt-4o-mini';
const REVIEW_MARKER = '<!-- codex-review -->';
const MAX_DIFF_CHARS = Number(process.env.CODEX_MAX_DIFF_CHARS || 12000);

async function main() {
  const {
    GITHUB_TOKEN,
    OPENAI_API_KEY,
    GITHUB_REPOSITORY,
    PR_NUMBER: envPrNumber,
    GITHUB_RUN_ID,
  } = process.env;

  const prNumber = process.argv[2] || envPrNumber;

  assertEnv({
    GITHUB_TOKEN,
    OPENAI_API_KEY,
    GITHUB_REPOSITORY,
    prNumber,
  });

  const repoBaseUrl = `https://api.github.com/repos/${GITHUB_REPOSITORY}`;

  const pr = await githubRequest(`${repoBaseUrl}/pulls/${prNumber}`);
  const files = await collectPrFiles(repoBaseUrl, prNumber);

  if (!files.length) {
    console.log('No files changed in this PR. Skipping Codex review.');
    return;
  }

  const trimmedDiff = buildDiffSummary(files);
  const prompt = buildPrompt({ pr, diff: trimmedDiff });

  const reviewBody = await runCodeReview(prompt);

  const commentBody = [
    REVIEW_MARKER,
    `Codex Review (workflow run #${GITHUB_RUN_ID || 'local'})`,
    '',
    reviewBody.trim(),
  ].join('\n');

  await upsertPrComment(repoBaseUrl, prNumber, commentBody);

  console.log('Codex review posted successfully.');
}

main().catch((error) => {
  console.error('Codex review failed:', error);
  process.exitCode = 1;
});

function assertEnv(values) {
  const missing = Object.entries(values)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

async function collectPrFiles(repoBaseUrl, prNumber) {
  const files = [];
  let page = 1;

  while (true) {
    const pageFiles = await githubRequest(
      `${repoBaseUrl}/pulls/${prNumber}/files?per_page=100&page=${page}`
    );

    if (!Array.isArray(pageFiles) || pageFiles.length === 0) {
      break;
    }

    files.push(...pageFiles);

    if (pageFiles.length < 100) {
      break;
    }

    page += 1;
  }

  return files;
}

function buildDiffSummary(files) {
  const sections = [];
  let totalChars = 0;

  for (const file of files) {
    if (!file.patch) {
      continue;
    }

    const header = `File: ${file.filename} (${file.status})`;
    const snippet = truncatePatch(file.patch, MAX_DIFF_CHARS - totalChars - header.length - 2);

    if (!snippet) {
      break;
    }

    const section = `${header}\n${snippet}`;
    sections.push(section);
    totalChars += section.length + 2; // account for blank line separator

    if (totalChars >= MAX_DIFF_CHARS) {
      sections.push('[Diff truncated due to size limits]');
      break;
    }
  }

  return sections.join('\n\n');
}

function truncatePatch(patch, remainingBudget) {
  if (remainingBudget <= 0) {
    return '';
  }

  if (patch.length <= remainingBudget) {
    return patch;
  }

  const truncated = patch.slice(0, Math.max(0, remainingBudget - 20));
  return `${truncated}\n... [truncated]`;
}

function buildPrompt({ pr, diff }) {
  const { title, body, user, html_url } = pr;
  const author = user?.login || 'unknown';

  return [
    `Repository: ${html_url}`,
    `Title: ${title}`,
    `Author: ${author}`,
    '',
    'Pull Request Description:',
    body || '(no description provided)',
    '',
    'Unified Diff:',
    diff,
    '',
    'Instructions:',
    '- Act as an experienced senior engineer performing a thorough code review.',
    '- Focus on correctness, security, performance, and maintainability.',
    '- Flag behavioral regressions, unfinished work, missing tests, or broken patterns.',
    '- Reference specific files and line numbers when pointing out issues.',
    '- Use GitHub markdown with bullets. Each item should start with `[SEVERITY] path:line`.',
    '- Severity levels: HIGH (blocking), MEDIUM (needs follow-up), LOW (nit or suggestion).',
    '- Include a short Summary and Testing sections at the end. If no issues, state that explicitly.',
  ].join('\n');
}

async function runCodeReview(prompt) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      temperature: Number(process.env.OPENAI_TEMPERATURE || 0.2),
      max_tokens: Number(process.env.OPENAI_MAX_TOKENS || 1200),
      messages: [
        {
          role: 'system',
          content: 'You are Codex, an AI assistant that performs high-signal GitHub pull request reviews.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await safeJson(response);
    throw new Error(
      `OpenAI API error (${response.status}): ${
        error?.error?.message || response.statusText
      }`
    );
  }

  const payload = await response.json();
  const message = payload?.choices?.[0]?.message?.content;

  if (!message) {
    throw new Error('OpenAI API returned an empty response.');
  }

  return message;
}

async function upsertPrComment(repoBaseUrl, prNumber, body) {
  const existing = await listExistingComment(repoBaseUrl, prNumber);

  if (existing) {
    await githubRequest(`${repoBaseUrl}/issues/comments/${existing.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ body }),
    });
    return;
  }

  await githubRequest(`${repoBaseUrl}/issues/${prNumber}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
}

async function listExistingComment(repoBaseUrl, prNumber) {
  const comments = await githubRequest(
    `${repoBaseUrl}/issues/${prNumber}/comments?per_page=100`
  );

  if (!Array.isArray(comments)) {
    return null;
  }

  return comments.find(
    (comment) =>
      typeof comment?.body === 'string' &&
      comment.body.includes(REVIEW_MARKER) &&
      comment?.user?.type === 'Bot'
  );
}

async function githubRequest(url, options = {}) {
  const headers = {
    'User-Agent': 'codex-review-bot',
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    ...options.headers,
  };

  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await safeJson(response);
    throw new Error(
      `GitHub API error (${response.status}) for ${url}: ${
        error?.message || response.statusText
      }`
    );
  }

  if (response.status === 204) {
    return null;
  }

  return safeJson(response);
}

async function safeJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
