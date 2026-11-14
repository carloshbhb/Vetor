export type PhotoTreatment =
 | {kind:'greyscale';contrast:number}
 | {kind:'sepia';amount:number}
 | {kind:'duotone';dark:string;light:string}
 | {kind:'muted';saturate:number;sepia:number}
 | {kind:'halftone';pitchPctH:number;angle:number};
