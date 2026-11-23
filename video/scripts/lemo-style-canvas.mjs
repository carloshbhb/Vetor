/**
 * Vetor-authored procedural motion motifs for the 15 Lemo style families.
 * This is original renderer code; upstream style-guide text and demo assets are not bundled.
 */
export function buildLemoCanvasScript() {
  return String.raw\`function drawStyleMotif(t,W,H,s){
    const f=cfg.style.family,a=cfg.style.accent;
    ctx.save();ctx.lineWidth=2*s;ctx.strokeStyle=a;ctx.fillStyle=a;ctx.globalAlpha=.3;
    const rnd=(n)=>Math.abs(Math.sin(n*91.7)*43758.5453)%1;
    if(f==='documentary'){
      for(let y=H*.18;y<H*.82;y+=14*s){ctx.globalAlpha=.12;ctx.fillRect(0,y,W,1*s);}
      ctx.globalAlpha=.55;ctx.strokeRect(32*s,32*s,W-64*s,H-64*s);
    }else if(f==='painterly'){
      for(let i=0;i<24;i++){const x=W*(.08+rnd(i)*.84),y=H*(.12+rnd(i+9)*.76);ctx.globalAlpha=.08+rnd(i+2)*.12;ctx.lineWidth=(5+rnd(i+3)*18)*s;ctx.beginPath();ctx.moveTo(x-90*s,y+20*s);ctx.quadraticCurveTo(x,y-30*s,x+110*s,y+12*s);ctx.stroke();}
    }else if(f==='sketch'){
      ctx.globalAlpha=.34;ctx.setLineDash([7*s,6*s]);for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(W*.08,H*(.22+i*.12));ctx.lineTo(W*.92,H*(.22+i*.12)+Math.sin(t+i)*12*s);ctx.stroke();}ctx.setLineDash([]);ctx.strokeRect(W*.08,H*.18,W*.84,H*.62);
    }else if(f==='craft'){
      for(let i=0;i<4;i++){const x=W*(.12+i*.055),y=H*(.2+i*.035),w=W*(.32+i*.04),h=H*(.36+i*.025);ctx.globalAlpha=.12+i*.035;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w,y+12*s);ctx.lineTo(x+w-22*s,y+h);ctx.lineTo(x-18*s,y+h-14*s);ctx.closePath();ctx.fill();}
    }else if(f==='print'){
      ctx.globalAlpha=.16;for(let y=H*.14;y<H*.86;y+=9*s)for(let x=W*.06;x<W*.94;x+=9*s){ctx.beginPath();ctx.arc(x,y,1.3*s,0,Math.PI*2);ctx.fill();}
      ctx.globalAlpha=.5;ctx.strokeRect(W*.07,H*.12,W*.86,H*.76);
    }else if(f==='graphic'){
      ctx.globalAlpha=.22;ctx.fillRect(W*.07,H*.2,W*.16,H*.12);ctx.fillRect(W*.78,H*.62,W*.15,H*.14);ctx.beginPath();ctx.moveTo(W*.1,H*.78);ctx.lineTo(W*.3,H*.64);ctx.lineTo(W*.42,H*.82);ctx.closePath();ctx.fill();
    }else if(f==='diagram'){
      ctx.globalAlpha=.55;for(let i=0;i<4;i++){const x=W*(.18+i*.19),y=H*(.28+(i%2)*.28);ctx.beginPath();ctx.arc(x,y,12*s,0,Math.PI*2);ctx.stroke();if(i<3){ctx.beginPath();ctx.moveTo(x+12*s,y);ctx.lineTo(x+W*.12,y+H*.1);ctx.stroke();}}
      ctx.setLineDash([5*s,5*s]);ctx.strokeRect(W*.12,H*.18,W*.76,H*.62);ctx.setLineDash([]);
    }else if(f==='cartoon'){
      ctx.globalAlpha=.28;for(let i=0;i<28;i++){const ang=i*Math.PI/14,x=W*.5+Math.cos(ang)*W*.42,y=H*.5+Math.sin(ang)*H*.42;ctx.beginPath();ctx.moveTo(W*.5+Math.cos(ang)*W*.28,H*.5+Math.sin(ang)*H*.28);ctx.lineTo(x,y);ctx.stroke();}ctx.strokeRect(W*.06,H*.1,W*.88,H*.8);
    }else if(f==='game'){
      ctx.globalAlpha=.25;const cell=16*s;for(let x=W*.06;x<W*.94;x+=cell){ctx.fillRect(x,H*.16,2*s,2*s);ctx.fillRect(x,H*.84,2*s,2*s);}ctx.strokeRect(W*.08,H*.14,W*.84,H*.72);
    }else if(f==='analog'){
      ctx.globalAlpha=.16;for(let y=0;y<H;y+=5*s)ctx.fillRect(0,y,W,1*s);ctx.globalAlpha=.55;for(let y=H*.2;y<H*.82;y+=H*.12){ctx.beginPath();ctx.arc(W*.035,y,8*s,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(W*.965,y,8*s,0,Math.PI*2);ctx.stroke();}
    }else if(f==='interface'){
      ctx.globalAlpha=.38;ctx.strokeRect(W*.07,H*.14,W*.86,H*.72);ctx.fillRect(W*.07,H*.14,W*.86,28*s);for(let i=0;i<3;i++){ctx.strokeRect(W*(.12+i*.25),H*.27,W*.19,H*.17);ctx.fillRect(W*(.12+i*.25),H*.49,W*.15,3*s);}
    }else if(f==='neon'){
      ctx.globalAlpha=.62;ctx.shadowColor=a;ctx.shadowBlur=18*s;for(let k=0;k<3;k++){ctx.beginPath();for(let x=0;x<=W;x+=12*s){const y=H*(.25+k*.22)+Math.sin(x/(65*s)+t*1.4+k)*28*s;if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();}
    }else if(f==='miniature'){
      ctx.globalAlpha=.28;for(let i=0;i<5;i++){const y=H*(.24+i*.1);ctx.beginPath();ctx.moveTo(W*.12,y);ctx.lineTo(W*.5,y-34*s);ctx.lineTo(W*.88,y);ctx.lineTo(W*.5,y+34*s);ctx.closePath();ctx.stroke();}ctx.fillRect(W*.16,H*.77,W*.68,4*s);
    }else if(f==='evidence'){
      ctx.globalAlpha=.58;const x=W*.5,y=H*.48,r=Math.min(W,H)*(.12+.025*Math.sin(t));ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(x-r*1.5,y);ctx.lineTo(x+r*1.5,y);ctx.moveTo(x,y-r*1.5);ctx.lineTo(x,y+r*1.5);ctx.stroke();ctx.beginPath();ctx.moveTo(x,y);ctx.arc(x,y,r*1.8,-.7+t*.7,.3+t*.7);ctx.closePath();ctx.fill();
    }else if(f==='dataviz'){
      ctx.globalAlpha=.42;for(let i=0;i<7;i++){const x=W*(.12+i*.11),h=H*(.08+(.15+.08*Math.sin(i*1.7+t*.6)));ctx.fillRect(x,H*.82-h,W*.055,h);}ctx.beginPath();for(let i=0;i<7;i++){const x=W*(.13+i*.11),y=H*(.34+Math.sin(i*.8+t*.4)*.055);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();
    }
    ctx.restore();
  }\`;
}
