# Three.js motion graphics in the Vetor video pipeline

The video project now includes Three.js, React Three Fiber and Remotion's official Three.js adapter.

## Scope and safety

- Remotion remains the primary renderer.
- The existing render script, Root registrations, queue worker, QA and YouTube upload flow are unchanged.
- `ThreeMotionGraphicsScene.tsx` is an optional transparent overlay component. It is deliberately not imported by `Root.tsx` and therefore does not affect existing Short, long-form or comparison outputs.
- Add it only to a new or explicitly selected composition after visual QA.

## Installed versions

- `remotion`: 4.0.534 (existing)
- `@remotion/three`: 4.0.534 (aligned with Remotion)
- `@react-three/fiber`: 9.8.2
- `three`: 0.186.1
- `@types/three`: 0.186.0

## Rendering rules

Use `ThreeCanvas` with explicit `width` and `height`. Drive all animation from Remotion's `useCurrentFrame()`; do not use React Three Fiber's `useFrame()` for time-based animation, because frames must render deterministically when Remotion scrubs or renders out of order. If a `Sequence` is placed inside a ThreeCanvas, use `layout="none"`.

Example component: `src/motion-graphics/ThreeMotionGraphicsScene.tsx`.
