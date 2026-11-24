export interface VisualDirectionSceneInput {
  id?: string | number;
  type?: string;
  kind?: string;
  title?: string;
  text?: string;
  visualCue?: string;
  brollKeywords?: string[];
  visualIntent?: string;
  visualTemplates?: string[];
  productModelUrl?: string;
  verifiedComponents?: string[];
  shotcraftRecipeId?: string;
}

export interface VisualDirectionPlan {
  sceneId: string | number;
  narrativeBeat: string;
  visualIntent: string;
  directionSource: string;
  primaryTemplate: string;
  supportTemplates: string[];
  templateIds: string[];
  templateNames: string[];
  transitionIn: string;
  shotcraftRecipeId: string;
  shotcraftRecipeCategory: string;
  shotcraftRecipeSelection: 'narrative-auto' | 'manual' | 'scene-manual';
  energy: string;
  rhythmSeconds: number;
  visualLayers: string[];
  assets: {
    realProductImage: boolean;
    galleryCutaway: boolean;
    lifestyleFootage: boolean;
    brollAvailable: boolean;
    dataMustComeFromScene: boolean;
  };
  renderPlan: {
    version: 2;
    renderer: 'three-product' | 'three-motion-graphics' | 'cinematic-footage' | 'motion-graphics' | 'layered-2d';
    shotType: string;
    action: string;
    cameraMove: string;
    productProfile: string;
    productRepresentation: string;
    assetRequirement: string;
    hasMatchedBroll: boolean;
    verifiedComponents: string[];
    usesTrueProductGeometry: boolean;
    visualFidelity: string;
    modelAssetStatus: 'verified' | 'unverified' | 'missing';
    modelAssetSha256: string | null;
    modelAssetVerifiedBy: string | null;
    modelAssetVerifiedAt: string | null;
    motionContract: {
      cameraMustMove: boolean;
      objectMustMove: boolean;
      minCameraTravel: number;
      minScaleDelta: number;
    };
    fallbackReason: string | null;
  };
  artDirection: string;
}

export function planVetorSceneMixes(input: {
  scenes?: VisualDirectionSceneInput[];
  title?: string;
  category?: string;
  manualTemplateId?: string | null;
  hasProductGallery?: boolean;
  hasBroll?: boolean | boolean[];
  verified3DModel?: {
    verified: boolean;
    url: string;
    sha256: string;
    verifiedBy: string;
    verifiedAt: string;
  } | null;
  hasUnverified3DModel?: boolean;
  manualShotcraftRecipeId?: string | null;
}): VisualDirectionPlan[];

export function inferProductModelProfile(title?: string, category?: string): string;
export function buildSceneRenderPlan(input?: {
  scene?: VisualDirectionSceneInput;
  beat?: string;
  primaryTemplate?: string;
  index?: number;
  title?: string;
  category?: string;
  hasBroll?: boolean;
  previousCameraMove?: string | null;
  verified3DModel?: {
    verified: boolean;
    url: string;
    sha256: string;
    verifiedBy: string;
    verifiedAt: string;
  } | null;
  hasUnverified3DModel?: boolean;
}): VisualDirectionPlan['renderPlan'];
