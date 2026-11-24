# Blender asset workflow for Vetor

Blender is the **local 3D asset workshop**. Remotion remains the production renderer and compositor. A reviewed .glb is uploaded to the existing product-media storage and passed to the current product_model_url / product_3d_url path; Blender is not installed on Vercel and is not part of the Shorts publishing worker.

## 1. Install the local Blender MCP

Requirements: Blender 3.0+, Python 3.10+, and the official uv installer.

Install the MCP server and Blender add-on:

~~~bash
uvx mcp-for-blender install-addon
~~~

In Blender, enable **Edit → Preferences → Add-ons → Interface: MCP for Blender**. Open the 3D View sidebar with N, select the **MCP for Blender** panel and start the local server.

For Codex, register the server with safe mode enabled:

~~~bash
codex mcp add blender --env BLENDER_MCP_SAFE_MODE=1 -- uvx mcp-for-blender
~~~

Equivalent client configuration:

~~~json
{
  "mcpServers": {
    "blender": {
      "command": "uvx",
      "args": ["mcp-for-blender"],
      "env": {
        "BLENDER_MCP_SAFE_MODE": "1",
        "BLENDER_HOST": "localhost",
        "BLENDER_PORT": "9876"
      }
    }
  }
}
~~~

**Security:** the add-on socket has no authentication or encryption and can execute Python in Blender. Keep it bound to localhost; never expose port 9876 to the public internet. Keep BLENDER_MCP_SAFE_MODE=1. The MCP server is a local authoring tool, not a cloud service.

Upstream: [ahujasid/mcp-for-blender](https://github.com/ahujasid/mcp-for-blender).

## 2. Author the product model

Use the actual listing photos, official dimensions and product documentation as references. Create only details that are visible or documented. Do not infer hidden internals, ports, buttons, seams, materials or included accessories from a generic category archetype.

For each asset:
- Keep separate mesh objects for physically distinct parts that need independent motion.
- Use real product proportions and assign physically plausible materials.
- Name meaningful parts clearly (body, lid, handle, screen, earcup_left, etc.).
- Keep the product near the scene origin and remove test objects.
- Save the .blend source before export.
- Compare front, side, back and detail views against the listing before marking the asset verified.

A generated model is a draft until a human has checked it against the real product. This matters because AI-generated geometry can add or omit details.

## 3. Export GLB for Remotion

From a terminal with Blender available:

~~~bash
blender --background ./product.blend \
  --python ./video/blender/export_product_glb.py -- \
  --output ./dist/product-slug.glb \
  --product-id product-slug
~~~

A revisão humana deve citar a listagem exata e/ou documentação oficial usada para conferir o SKU:

~~~
blender --background ./product.blend \
  --python ./video/blender/export_product_glb.py -- \
  --output ./dist/product-slug.glb \
  --product-id product-slug \
  --verified-by "Nome do revisor" \
  --source-reference "https://loja.example/produto-sku" \
  --source-reference "https://fabricante.example/especificacoes"
~~~

Sem `--verified-by` e ao menos um `--source-reference`, o manifesto permanece `pending-human-review`.

The script exports visible mesh objects, applies rotation/scale by default, preserves materials, and writes a .manifest.json containing dimensions, mesh count and SHA-256. The manifest remains pending-human-review unless the export is explicitly marked with --verified-by "Reviewer".

Only after visual verification, upload the .glb to the product-model storage bucket and attach the manifest fields (SHA-256 plus review metadata) to the same product media asset marker as:

~~~json
{
  "type": "product_model_3d",
  "url": "https://YOUR_SUPABASE_PROJECT.supabase.co/storage/v1/object/public/product-models/product-slug.glb",
  "sha256": "<sha256 from the manifest>",
  "review": {
    "status": "verified",
    "verifiedBy": "Nome do revisor",
    "verifiedAt": "2026-11-23T12:00:00Z",
    "sourceReferences": [
      "https://loja.example/produto-sku",
      "https://fabricante.example/especificacoes"
    ]
  }
}
~~~

The URL must be publicly readable by the render worker (or use a supported signed URL with enough lifetime for the render). The current pipeline reads this marker from media_assets, product_model_url or product_3d_url, downloads the candidate GLB (maximum 50 MB), recalculates SHA-256 over the actual bytes, then stages those exact bytes as a temporary Remotion static asset so the renderer does not download the model from storage again. If the digest differs from the reviewed manifest, the worker rejects the model and falls back to the illustrative/photo path; the temporary asset is cleaned after processing and no new renderer or publication step is introduced.

## 4. Quality gate before use

A model is ready for product video only after:
1. Silhouette and proportions match listing photos.
2. Ports, controls, logo placement, materials and included components are checked.
3. No hidden internals are presented as fact without official documentation.
4. GLB opens in a clean Blender scene and in the Remotion 3D smoke render.
5. The product owner has reviewed the exported result.

If these checks are not met, keep the existing real product photos and 2.5D or explicitly illustrative parametric 3D path. The render worker ignores an unreviewed GLB as an exact product model. Never substitute a generic parametric object and label it as the exact product.
