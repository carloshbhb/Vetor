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

    // After successful commit, ping Google to re‑index the sitemap
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vetor.blog';
      const sitemapUrl = encodeURIComponent(`${siteUrl}/sitemap.xml`);
      await fetch(`https://www.google.com/ping?sitemap=${sitemapUrl}`);
      console.log('[GitHub] ✅ Pinged Google sitemap after commit');
    } catch (pingErr) {
      console.warn('[GitHub] Failed to ping Google sitemap:', pingErr);
    }

    console.log(`[GitHub] ✅ Committed review "${newReview.product}" (ID: ${newReview.id}) to ${GITHUB_REPO}`);
    return { success: true };
  } catch (err: any) {
    console.error('[GitHub] Commit error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Commits an updated review to the GitHub repository.
 * Fetches the authoritative file from GitHub, replaces/updates the review by id, and commits.
 */
export async function commitUpdateReviewToGitHub(
  id: string,
  updatedReview: Record<string, any>,
): Promise<{ success: boolean; error?: string }> {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    console.warn('[GitHub] GITHUB_TOKEN not configured. Review update will NOT persist across Vercel deployments.');
    return { success: false, error: 'GITHUB_TOKEN not set' };
  }

  try {
    // 1. Fetch the current authoritative file from GitHub
    const { data: reviews, sha } = await fetchFileFromGitHub(token);

    // 2. Find and update the review
    const idx = reviews.findIndex((r: any) => r.id === id);
    if (idx === -1) {
      // If not found in the GitHub repo, append it as fallback
      reviews.push(updatedReview);
    } else {
      reviews[idx] = updatedReview;
    }

    // 3. Commit the changes
    await commitFileToGitHub(
      token,
      reviews,
      sha,
      `🤖 Auto-update: ${updatedReview.product}`,
    );

    console.log(`[GitHub] ✅ Updated review "${updatedReview.product}" (ID: ${id}) on ${GITHUB_REPO}`);
    return { success: true };
  } catch (err: any) {
    console.error('[GitHub] Update commit error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Commits the deletion of a review from the GitHub repository.
 * Fetches the authoritative file from GitHub, filters out the review by id, and commits.
 */
export async function commitDeleteReviewFromGitHub(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    console.warn('[GitHub] GITHUB_TOKEN not configured. Review deletion will NOT persist across Vercel deployments.');
    return { success: false, error: 'GITHUB_TOKEN not set' };
  }

  try {
    // 1. Fetch the current authoritative file from GitHub
    const { data: reviews, sha } = await fetchFileFromGitHub(token);

    // 2. Filter out the deleted review
    const filtered = reviews.filter((r: any) => r.id !== id);
    if (filtered.length === reviews.length) {
      console.log(`[GitHub] Review "${id}" not found on GitHub to delete.`);
      return { success: false, error: 'Review not found in repository' };
    }

    // 3. Commit the changes
    await commitFileToGitHub(
      token,
      filtered,
      sha,
      `🤖 Auto-delete review: ${id}`,
    );

    console.log(`[GitHub] ✅ Deleted review (ID: ${id}) from ${GITHUB_REPO}`);
    return { success: true };
  } catch (err: any) {
    console.error('[GitHub] Delete commit error:', err.message);
    return { success: false, error: err.message };
  }
}
