export const h01=(...n:number[])=>{let x=2166136261;for(const v of n){x^=Math.floor(v*1000)|0;x=Math.imul(x,16777619);}x^=x>>>13;x=Math.imul(x,0x5bd1e995);x^=x>>>15;return(x>>>0)/4294967296;};
