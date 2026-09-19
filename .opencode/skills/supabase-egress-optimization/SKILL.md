---
name: supabase-egress-optimization
description: "Optimize Supabase egress to reduce costs and improve performance. Use when working with Supabase Storage, serving files/images, implementing caching strategies, optimizing CDN usage, reducing Data API response sizes, or when the user asks about egress costs, bandwidth optimization, or data transfer reduction. Triggers: egress, bandwidth, storage optimization, image optimization, cache-control, CDN, data transfer, response size, payload optimization."
metadata:
  author: custom
  version: "1.0.0"
---

# Supabase Egress Optimization

Comprehensive guide to reduce Supabase egress costs and improve application performance.

## Core Principles

**1. Measure before optimizing.** Check your current egress usage in the Supabase Dashboard → Settings → Usage before making changes. Identify which service (Storage, Database API, Edge Functions) contributes most to egress.

**2. Images are the #1 egress consumer.** Most egress comes from serving images. Focus optimization efforts here first.

**3. Cache aggressively, invalidate carefully.** Every cache hit avoids an egress charge. Use browser caching, CDN caching, and application-level caching strategically.

## Storage Egress Optimization

### Image Optimization

Images typically make up most of storage egress. Optimize them at the edge:

```typescript
// Use Supabase Image Transformation for on-the-fly optimization
const { data } = supabase.storage
  .from('avatars')
  .getPublicUrl('user-123.jpg', {
    transform: {
      width: 400,
      height: 400,
      resize: 'cover',
      format: 'webp', // Modern format = smaller file size
      quality: 80
    }
  })
```

**Best practices:**
- Use `webp` or `avif` formats instead of `png`/`jpg`
- Set appropriate quality (70-85 is usually sufficient)
- Resize images to the maximum display size needed
- Use `cover` or `contain` resize modes to prevent oversized responses

### Cache-Control Headers

Set high cache-control values to leverage browser caching:

```sql
-- Update bucket cache settings via SQL
UPDATE storage.buckets
SET file_size_limit = 5242880, -- 5MB limit
    allowed_mime_types = ARRAY['image/*']
WHERE id = 'avatars';

-- Set cache-control via metadata when uploading
```

```typescript
// Upload with cache-control metadata
await supabase.storage
  .from('public-assets')
  .upload('banner.jpg', file, {
    cacheControl: '31536000', // 1 year
    contentType: 'image/jpeg'
  })
```

**Recommended cache durations:**
| Asset Type | Cache Duration |
|------------|----------------|
| Static assets (logos, icons) | 1 year (31536000) |
| User content (avatars) | 1 week (604800) |
| Frequently updated content | 1 hour (3600) |

### Smart CDN

Supabase's Smart CDN caches assets globally. Higher cache hit rates = lower egress costs.

```typescript
// Enable Smart CDN in bucket settings
// Dashboard → Storage → Buckets → [bucket] → Settings → Enable Smart CDN
```

**Cache hit rate optimization:**
- Use consistent file naming (avoid cache-busting query params for static assets)
- Set appropriate cache-control headers
- Use transform parameters consistently (same width/height/format)

### Upload Size Limits

Prevent users from uploading excessively large files:

```sql
-- Set per-bucket file size limit
UPDATE storage.buckets
SET file_size_limit = 10485760 -- 10MB
WHERE id = 'user-uploads';
```

### Optimize Listing Objects

For buckets with many objects, use a Postgres function instead of `supabase.storage.list()`:

```sql
CREATE OR REPLACE FUNCTION list_objects(
    bucketid TEXT,
    prefix TEXT,
    limits INT DEFAULT 100,
    offsets INT DEFAULT 0
) RETURNS TABLE (
    name TEXT,
    id UUID,
    updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    last_accessed_at TIMESTAMPTZ,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        objects.name,
        objects.id,
        objects.updated_at,
        objects.created_at,
        objects.last_accessed_at,
        objects.metadata
    FROM storage.objects
    WHERE objects.name LIKE prefix || '%'
    AND bucket_id = bucketid
    ORDER BY name ASC
    LIMIT limits
    OFFSET offsets;
END;
$$ LANGUAGE plpgsql STABLE;
```

```typescript
// Use the optimized function
const { data, error } = await supabase.rpc('list_objects', {
  bucketid: 'avatars',
  prefix: 'user-123/',
  limits: 50,
  offsets: 0
})
```

## Data API (PostgREST) Egress Optimization

### Select Only Required Fields

Avoid `SELECT *` — it returns all columns and wastes egress:

```typescript
// ❌ Bad: Returns all columns
const { data } = await supabase
  .from('products')
  .select('*')

// ✅ Good: Returns only needed columns
const { data } = await supabase
  .from('products')
  .select('id, name, price, image_url')
```

### Use Filters and Pagination

Don't fetch more rows than needed:

```typescript
// ❌ Bad: Fetches all rows
const { data } = await supabase
  .from('orders')
  .select('*')

// ✅ Good: Paginated with filters
const { data } = await supabase
  .from('orders')
  .select('id, total, created_at')
  .eq('status', 'pending')
  .order('created_at', { ascending: false })
  .range(0, 19) // First 20 rows
```

### Avoid Returning Full Rows on Mutations

Configure queries to not return unnecessary data:

```typescript
// ❌ Bad: Returns entire inserted row
const { data } = await supabase
  .from('events')
  .insert({ event_type: 'click', user_id: 123 })
  .select()

// ✅ Good: Return only what you need
const { data } = await supabase
  .from('events')
  .insert({ event_type: 'click', user_id: 123 })
  .select('id, created_at')

// ✅ Better: Don't return anything if not needed
const { error } = await supabase
  .from('events')
  .insert({ event_type: 'click', user_id: 123 })
```

### Use RPC for Complex Queries

Move complex logic to Postgres functions to reduce data transfer:

```sql
-- Create a function that returns only aggregated data
CREATE OR REPLACE FUNCTION get_dashboard_stats(user_id UUID)
RETURNS TABLE (
    total_orders BIGINT,
    total_spent NUMERIC,
    recent_items JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) as total_orders,
        SUM(total) as total_spent,
        (
            SELECT jsonb_agg(jsonb_build_object('name', name, 'price', price))
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.user_id = $1
            ORDER BY oi.created_at DESC
            LIMIT 5
        ) as recent_items
    FROM orders
    WHERE orders.user_id = $1;
END;
$$ LANGUAGE plpgsql STABLE;
```

```typescript
// Single RPC call instead of multiple queries
const { data } = await supabase.rpc('get_dashboard_stats', {
  user_id: 'user-123'
})
```

## Edge Functions Egress Optimization

### Use Streaming for Large Responses

```typescript
// Stream large responses instead of buffering
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const response = await fetch(largeUrl)

  // Stream the response
  return new Response(response.body, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Cache-Control': 'public, max-age=3600'
    }
  })
})
```

### Compress Responses

```typescript
// Add compression for text-based responses
serve(async (req) => {
  const data = await fetchData()

  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Encoding': 'gzip',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate'
    }
  })
})
```

## RLS Policy Optimization

Optimize RLS policies for storage to reduce query overhead:

```sql
-- Add indexes on frequently filtered storage columns
CREATE INDEX idx_storage_objects_bucket_name
ON storage.objects (bucket_id, name);

CREATE INDEX idx_storage_objects_owner
ON storage.objects (owner_id);

-- Optimized RLS policy using indexes
CREATE POLICY "Users can view own files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'private'
  AND owner_id = (SELECT auth.uid())
);
```

## Monitoring and Alerts

### Check Egress Usage

```sql
-- Query storage usage (requires appropriate permissions)
SELECT
    bucket_id,
    COUNT(*) as file_count,
    SUM((metadata->>'size')::BIGINT) as total_bytes
FROM storage.objects
GROUP BY bucket_id
ORDER BY total_bytes DESC;
```

### Set Up Alerts

Configure usage alerts in the Supabase Dashboard:
- Settings → Usage → Egress
- Set alerts at 80% and 100% of your plan limit

## Quick Reference

| Strategy | Impact | Implementation |
|----------|--------|----------------|
| Image Transformation | HIGH | Use `getPublicUrl` with transform params |
| Cache-Control headers | HIGH | Set `cacheControl` on upload |
| Smart CDN | HIGH | Enable in bucket settings |
| Select specific fields | MEDIUM | Use `select('col1, col2')` |
| Pagination | MEDIUM | Use `.range()` or `.limit()` |
| Avoid SELECT * | MEDIUM | Always specify columns |
| RPC for aggregates | MEDIUM | Move complex queries to functions |
| Upload size limits | LOW | Set `file_size_limit` on buckets |
| RLS indexes | LOW | Index filtered storage columns |

## References

- [Storage Optimizations](https://supabase.com/docs/guides/storage/production/scaling)
- [Manage Egress Usage](https://supabase.com/docs/guides/platform/manage-your-usage/egress)
- [Image Transformation](https://supabase.com/docs/guides/storage/storage-image-transformation)
- [Smart CDN](https://supabase.com/docs/guides/storage/cdn)
