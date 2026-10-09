import assert from 'node:assert/strict';
import {
  buildComparativeIndexNowTargets,
  buildContentUrl,
  buildReviewIndexNowTargets,
  classifyIndexNowResponse,
  normalizeIndexNowUrl,
  pingIndexNow,
} from '../src/lib/indexnow';

assert.equal(
  buildContentUrl('/reviews/moto-g06-128gb-review'),
  'https://www.vetor.blog/reviews/moto-g06-128gb-review/'
);
assert.equal(
  buildContentUrl('https://www.vetor.blog/reviews/example#specs'),
  'https://www.vetor.blog/reviews/example/'
);
assert.throws(() => buildContentUrl('https://example.com/review/'));
assert.throws(() => buildContentUrl('https://user:pass@www.vetor.blog/review/'));
assert.throws(() => buildContentUrl('https://www.vetor.blog:8443/review/'));
assert.throws(() => buildContentUrl('https://www.vetor.blog/review/?utm_source=test'));
assert.throws(() => buildContentUrl(''));

assert.equal(
  normalizeIndexNowUrl('https://www.vetor.blog/reviews/example'),
  'https://www.vetor.blog/reviews/example/'
);
assert.equal(
  normalizeIndexNowUrl('https://www.vetor.blog/reviews/example?utm_source=test'),
  null
);
assert.equal(normalizeIndexNowUrl('http://www.vetor.blog/reviews/example/'), null);
assert.equal(normalizeIndexNowUrl('https://vetor.blog/reviews/example/'), null);
assert.equal(normalizeIndexNowUrl('https://example.com/reviews/example/'), null);
assert.equal(normalizeIndexNowUrl('https://www.vetor.blog:8443/reviews/example/'), null);
assert.equal(normalizeIndexNowUrl('https://user:pass@www.vetor.blog/reviews/example/'), null);

assert.deepEqual(
  buildReviewIndexNowTargets('example-review', ['Acessórios para Games']),
  [
    'https://www.vetor.blog/reviews/example-review/',
    'https://www.vetor.blog/reviews/',
    'https://www.vetor.blog/reviews/categoria/Acess%C3%B3rios%20para%20Games/',
  ]
);
assert.equal(
  buildComparativeIndexNowTargets('moto-g06-vs-moto-g17')[0],
  'https://www.vetor.blog/comparativos/moto-g06-vs-moto-g17/'
);
assert.throws(() => buildReviewIndexNowTargets('../invalid'));
assert.throws(() => buildComparativeIndexNowTargets('a/b'));

assert.equal(classifyIndexNowResponse(200), 'submitted');
assert.equal(classifyIndexNowResponse(202), 'accepted_pending_validation');
assert.equal(classifyIndexNowResponse(403), 'rejected');
assert.equal(classifyIndexNowResponse(429), 'retryable');
assert.equal(classifyIndexNowResponse(503), 'retryable');

async function verifySubmissionContract(): Promise<void> {
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.INDEXNOW_KEY;
  const previousApiKey = process.env.INDEXNOW_API_KEY;
  const previousHost = process.env.INDEXNOW_HOST;
  const submittedBodies: Record<string, unknown>[] = [];

  process.env.INDEXNOW_KEY = 'unit-test-key-not-a-secret';
  delete process.env.INDEXNOW_API_KEY;
  process.env.INDEXNOW_HOST = 'www.vetor.blog';

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(String(input), 'https://api.indexnow.org/indexnow');
    assert.equal(init?.method, 'POST');
    assert.match(String(init?.headers && (init.headers as Record<string, string>)['Content-Type']), /application\/json/i);
    submittedBodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    return new Response('', { status: 202 });
  }) as typeof fetch;

  try {
    const result = await pingIndexNow(
      [
        'https://www.vetor.blog/reviews/example-review',
        'https://www.vetor.blog/reviews/example-review/',
        'https://example.com/not-ours/',
      ],
      'contract-test'
    );

    assert.equal(result.status, 'accepted_pending_validation');
    assert.equal(result.httpStatus, 202);
    assert.equal(result.attempted, 1, 'duplicate URLs should be removed and off-host URLs rejected');
    assert.equal(result.accepted, 1);
    assert.equal(result.source, 'contract-test');

    const submittedBody = submittedBodies[0];
    assert.ok(submittedBody);
    assert.equal(submittedBody.host, 'www.vetor.blog');
    assert.equal(submittedBody.key, 'unit-test-key-not-a-secret');
    assert.equal(
      submittedBody.keyLocation,
      'https://www.vetor.blog/unit-test-key-not-a-secret.txt'
    );
    assert.deepEqual(
      submittedBody.urlList,
      ['https://www.vetor.blog/reviews/example-review/']
    );
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.INDEXNOW_KEY;
    else process.env.INDEXNOW_KEY = previousKey;
    if (previousApiKey === undefined) delete process.env.INDEXNOW_API_KEY;
    else process.env.INDEXNOW_API_KEY = previousApiKey;
    if (previousHost === undefined) delete process.env.INDEXNOW_HOST;
    else process.env.INDEXNOW_HOST = previousHost;
  }
}

verifySubmissionContract()
  .then(() => console.log('indexing-contract: all assertions passed'))
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
