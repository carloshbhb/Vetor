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
  artDirection: string;
}

export function planVetorSceneMixes(input: {
  scenes?: VisualDirectionSceneInput[];
  title?: string;
  category?: string;
  manualTemplateId?: string | null;
  hasProductGallery?: boolean;
  hasBroll?: boolean;
}): VisualDirectionPlan[];
