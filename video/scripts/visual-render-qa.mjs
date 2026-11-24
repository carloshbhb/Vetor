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
  const shotTypes = new Set();
  const sceneIds = new Set();

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
    shotTypes.add(render.shotType);
    const sceneId = scene?.sceneId ?? scene?.id ?? number;
    if (sceneIds.has(String(sceneId))) {
      errors.push("Cena " + number + ": identificador de cena duplicado (" + sceneId + ").");
    }
    sceneIds.add(String(sceneId));
    if (!["three-product", "three-motion-graphics", "cinematic-footage", "motion-graphics", "layered-2d"].includes(render.renderer)) {
      errors.push("Cena " + number + ": renderer não suportado (" + render.renderer + ").");
    }
    if (scene?.assets?.dataMustComeFromScene === false) {
      errors.push("Cena " + number + ": dados visuais não podem ser fabricados fora das fontes da cena.");
    }

    if (!render.motionContract || render.motionContract.cameraMustMove !== true ||
        !Number.isFinite(render.motionContract.minCameraTravel) || render.motionContract.minCameraTravel <= 0 ||
        !Number.isFinite(render.motionContract.minScaleDelta) || render.motionContract.minScaleDelta <= 0) {
      errors.push("Cena " + number + ": movimento de câmera não está contratado.");
    }
    if (render.renderer === "three-product") {
      if (render.motionContract?.objectMustMove !== true) {
        errors.push("Cena " + number + ": produto 3D precisa declarar movimento do objeto.");
      }
      if (render.visualFidelity === "verified-3d-asset") {
        if (render.usesTrueProductGeometry !== true ||
            render.productRepresentation !== "verified-gltf-model" ||
            render.modelAssetStatus !== "verified" ||
            !/^[a-f0-9]{64}$/i.test(String(render.modelAssetSha256 || "")) ||
            typeof render.modelAssetVerifiedBy !== "string" || !render.modelAssetVerifiedBy.trim() ||
            !Number.isFinite(Date.parse(String(render.modelAssetVerifiedAt || ""))) ||
            !Array.isArray(render.modelAssetSourceReferences) || !render.modelAssetSourceReferences.some((item) => typeof item === "string" && item.trim())) {
          errors.push("Cena " + number + ": modelo 3D marcado como verificado sem manifesto, checksum, revisor e data válidos.");
        }
      } else if (render.visualFidelity === "illustrative-parametric-3d") {
        if (render.usesTrueProductGeometry !== false ||
            render.productRepresentation !== "parametric-archetype" ||
            render.modelAssetStatus === "verified") {
          errors.push("Cena " + number + ": arquétipo paramétrico não pode ser declarado como geometria real do produto.");
        }
        if (!/ilustrativo/i.test(String(render.fallbackReason || ""))) {
          errors.push("Cena " + number + ": 3D paramétrico precisa informar explicitamente que é ilustrativo.");
        }
      } else {
        errors.push("Cena " + number + ": fidelidade 3D não identificada corretamente.");
      }
    } else if (render.usesTrueProductGeometry === true) {
      errors.push("Cena " + number + ": geometria real declarada por um renderer que não é de produto 3D.");
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
    if (index > 1 && render.shotType === plans[index - 1]?.renderPlan?.shotType &&
        render.shotType === plans[index - 2]?.renderPlan?.shotType) {
      warnings.push("Cena " + number + ": três planos consecutivos usam o mesmo tipo de tomada.");
    }
    if (index > 1 && scene?.primaryTemplate &&
        scene.primaryTemplate === plans[index - 1]?.primaryTemplate &&
        scene.primaryTemplate === plans[index - 2]?.primaryTemplate) {
      warnings.push("Cena " + number + ": três cenas consecutivas repetem a mesma linguagem visual principal.");
    }
  });

  if (plans.length >= 4 && shotTypes.size < 2) {
    warnings.push("Sequência longa com apenas um tipo de tomada; revisar variedade visual.");
  }
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
