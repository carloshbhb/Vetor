"""Export the active Blender product scene as a Remotion-ready GLB.

Run with:
  blender --background product.blend --python export_product_glb.py -- \
    --output ./dist/product.glb --product-id product-slug

The script does not invent geometry, dimensions, or materials. It exports
meshes already authored or imported into Blender and writes a manifest that
remains pending human review unless --verified-by is supplied.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from datetime import datetime, timezone

import bpy
from mathutils import Vector


def parse_arguments() -> argparse.Namespace:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description="Export the active Blender scene to GLB for Vetor Remotion.")
    parser.add_argument("--output", required=True, help="Destination .glb file.")
    parser.add_argument("--product-id", required=True, help="Stable Vetor product slug or identifier.")
    parser.add_argument("--verified-by", default="", help="Human reviewer who checked geometry against source product photos.")
    parser.add_argument("--skip-apply-transforms", action="store_true", help="Preserve object rotation and scale instead of applying them.")
    return parser.parse_args(argv)


def sha256_file(path: str) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def scene_bounds(objects: list[bpy.types.Object]) -> dict:
    corners = []
    for obj in objects:
        for corner in obj.bound_box:
            corners.append(obj.matrix_world @ Vector(corner))
    if not corners:
        raise RuntimeError("No mesh bounds found; refusing to export an empty product model.")
    minimum = [min(point[axis] for point in corners) for axis in range(3)]
    maximum = [max(point[axis] for point in corners) for axis in range(3)]
    return {
        "min": [round(value, 6) for value in minimum],
        "max": [round(value, 6) for value in maximum],
        "size": [round(maximum[index] - minimum[index], 6) for index in range(3)],
    }


def export_glb(args: argparse.Namespace) -> dict:
    output_path = os.path.abspath(os.path.expanduser(args.output))
    if not output_path.lower().endswith(".glb"):
        raise ValueError("--output must end in .glb")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    mesh_objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH" and not obj.hide_render]
    if not mesh_objects:
        raise RuntimeError("Active scene has no visible mesh objects. Create or import the product model first.")

    if not args.skip_apply_transforms:
        bpy.ops.object.select_all(action="DESELECT")
        for obj in mesh_objects:
            obj.select_set(True)
            bpy.context.view_layer.objects.active = obj
            bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
            obj.select_set(False)

    # Keep separate mesh objects so product parts remain available for later animation.
    bpy.ops.object.select_all(action="DESELECT")
    for obj in mesh_objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = mesh_objects[0]

    result = bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
        export_animations=True,
        export_image_format="AUTO",
    )
    if "FINISHED" not in result or not os.path.isfile(output_path) or os.path.getsize(output_path) == 0:
        raise RuntimeError("Blender did not produce a non-empty GLB file.")

    materials = sorted({
        slot.material.name
        for obj in mesh_objects
        for slot in obj.material_slots
        if slot.material
    })
    manifest = {
        "schemaVersion": 1,
        "productId": args.product_id,
        "file": os.path.basename(output_path),
        "sha256": sha256_file(output_path),
        "bytes": os.path.getsize(output_path),
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "sourceBlend": bpy.data.filepath or None,
        "meshCount": len(mesh_objects),
        "materials": materials,
        "bounds": scene_bounds(mesh_objects),
        "format": "glb",
        "review": {
            "status": "verified" if args.verified_by.strip() else "pending-human-review",
            "verifiedBy": args.verified_by.strip() or None,
            "rule": "Compare silhouette, proportions, ports, controls, materials and included parts with the actual product listing before using as a verified product model.",
        },
    }
    manifest_path = os.path.splitext(output_path)[0] + ".manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as target:
        json.dump(manifest, target, ensure_ascii=False, indent=2)
        target.write("\n")

    print("[VETOR_BLENDER] GLB:", output_path)
    print("[VETOR_BLENDER] MANIFEST:", manifest_path)
    print("[VETOR_BLENDER] SHA256:", manifest["sha256"])
    print("[VETOR_BLENDER] REVIEW:", manifest["review"]["status"])
    return manifest


def main() -> None:
    args = parse_arguments()
    export_glb(args)


if __name__ == "__main__":
    main()
