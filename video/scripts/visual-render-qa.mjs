/**
 * Scene-level render QA. This validates the actual rendering contract, not just
 * template labels: every scene must declare an engine, action, camera move and
 * an honest fidelity/fallback classification.
 */

export function evaluateSceneRenderPlans(plans = []) {
  const errors = [];
  const warnings = [];
  const rendererCounts = {};
  const cameraMoves = [];

  if (!Array.isArray(plans) || plans.length === 0) {
    return { ok: false, errors: ["Storyboard sem cenas para validar."], warnings, rendererCounts, cameraMoves };
  }

  plans.forEach((scene, index) => {
    const number = index + 1;
    const render = scene?.renderPlan;
    if (!render || render.version !== 2) {
      errors.push("Cena " + number + ": renderPlan v2 ausente.");
      return;
    }
    for (const key of ["renderer", "shotType", "action", "cameraMove", "productProfile", "visualFidelity"]) {
      if (typeof render[key] !== "string" || !render[key].trim()) {
        errors.push("Cena " + number + ": campo obrigatório renderPlan." + key + " ausente.");
      }
    }
    rendererCounts[render.renderer] = (rendererCounts[render.renderer] || 0) + 1;
    cameraMoves.push(render.cameraMove);

    if (!render.motionContract || render.motionContract.cameraMustMove !== true) {
      errors.push("Cena " + number + ": movimento de câmera não está contratado.");
    }
    if (render.renderer === "three-product" && render.usesTrueProductGeometry !== true) {
      errors.push("Cena " + number + ": renderer three-product sem geometria de produto verificável.");
    }
    if (render.renderer === "three-product" && !["verified-3d-asset", "illustrative-parametric-3d"].includes(render.visualFidelity)) {
      errors.push("Cena " + number + ": fidelidade 3D não identificada corretamente.");
    }
    if (render.renderer === "cinematic-footage" && render.hasMatchedBroll !== true) {
      errors.push("Cena " + number + ": footage selecionado sem B-roll correspondente.");
    }
    if (render.renderer === "layered-2d" && render.productProfile === "unresolved" &&
        !/2\.5d|fotografia real/i.test(String(render.fallbackReason || ""))) {
      warnings.push("Cena " + number + ": produto sem modelo; confirmar que o tratamento 2.5D está identificado.");
    }
    if (scene.primaryTemplate === "lifestyle-demo" && !render.hasMatchedBroll &&
        (render.renderer !== "layered-2d" || !/sem simular uma demonstração real/i.test(String(render.fallbackReason || "")))) {
      errors.push("Cena " + number + ": lifestyle sem footage deve cair para 2.5D e declarar a limitação.");
    }
    if (scene.primaryTemplate === "exploded-teardown" && !(render.verifiedComponents || []).length &&
        !/esquemática/i.test(String(render.fallbackReason || ""))) {
      errors.push("Cena " + number + ": exploded view sem componentes verificados precisa ser identificado como esquemático.");
    }
    if (index > 0 && render.cameraMove === plans[index - 1]?.renderPlan?.cameraMove) {
      warnings.push("Cenas " + index + " e " + number + ": movimento de câmera repetido consecutivamente.");
    }
  });

  if (plans.length >= 4 && Object.keys(rendererCounts).length < 2) {
    warnings.push("Sequência longa com um único motor visual; revisar variedade de enquadramentos e linguagem.");
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    rendererCounts,
    cameraMoves,
  };
}

export function assertSceneRenderPlans(plans) {
  const result = evaluateSceneRenderPlans(plans);
  if (!result.ok) {
    throw new Error("[scene-render-qa] " + result.errors.join(" | "));
  }
  return result;
}
