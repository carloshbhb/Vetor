// ─────────────────────────────────────────────────────────────────────────────
// Vetor Blog — GitHub API Persistence Layer
// Commits reviews directly to the GitHub repository so Vercel auto-redeploys
// with updated data baked into the build. This solves the ephemeral /tmp
// problem on serverless platforms.
// ─────────────────────────────────────────────────────────────────────────────

const GITHUB_REPO = process.env.GITHUB_REPO || 'carloshbhb/Vetor';
const FILE_PATH = 'data/reviews.json';
const BRANCH = 'main';

interface GitHubFileResponse {
  sha: string;
  content: string;
  encoding: string;
}

/**
 * Fetches the current reviews.json from the GitHub repository.
 * Returns the parsed array and the file's SHA (required for updates).
 */
async function fetchFileFromGitHub(token: string): Promise<{ data: any[]; sha: string }> {
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}?ref=${BRANCH}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
      cache: 'no-store',
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`GitHub GET ${FILE_PATH} failed: ${res.status} — ${errText}`);
  }

  const file: GitHubFileResponse = await res.json();
  const content = Buffer.from(file.content, 'base64').toString('utf-8');
  const data = JSON.parse(content);

  return { data, sha: file.sha };
}

/**
 * Commits an updated reviews array back to the GitHub repository.
 * This triggers a Vercel auto-redeploy with the new data.
 */
async function commitFileToGitHub(
  token: string,
  reviews: any[],
  sha: string,
  message: string,
): Promise<void> {
  const newContent = Buffer.from(JSON.stringify(reviews, null, 2) + '\n').toString('base64');

  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        content: newContent,
        sha,
        branch: BRANCH,
      }),
    }
  );

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`GitHub PUT commit failed: ${res.status} — ${errBody}`);
  }
}

/**
 * Appends a new review to the GitHub repository's reviews.json and commits.
 * Returns { success, id } on success or { success: false, error } on failure.
 */
export async function commitNewReviewToGitHub(
  newReview: Record<string, any>,
): Promise<{ success: boolean; error?: string }> {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    console.warn('[GitHub] GITHUB_TOKEN not configured. Review will NOT persist across Vercel deployments.');
    return { success: false, error: 'GITHUB_TOKEN not set' };
  }

  try {
    // 1. Fetch the current authoritative file from GitHub
    const { data: reviews, sha } = await fetchFileFromGitHub(token);

    // 2. Duplicate check (by slug or product name)
    const slug = newReview.slug || '';
    const product = (newReview.product || '').toLowerCase();
    const isDuplicate = reviews.some((r: any) =>
      r.slug === slug || (r.product && r.product.toLowerCase() === product)
    );

    if (isDuplicate) {
      console.log(`[GitHub] Duplicate detected for "${newReview.product}". Skipping commit.`);
      return { success: false, error: 'Duplicate review already exists in repository' };
    }

    // 3. Append and commit
    reviews.push(newReview);
    await commitFileToGitHub(
      token,
      reviews,
      sha,
      `🤖 Auto-publish: ${newReview.product}`,
    );

    console.log(`[GitHub] ✅ Committed review "${newReview.product}" (ID: ${newReview.id}) to ${GITHUB_REPO}`);
    return { success: true };
  } catch (err: any) {
    console.error('[GitHub] Commit error:', err.message);
    return { success: false, error: err.message };
  }
}
