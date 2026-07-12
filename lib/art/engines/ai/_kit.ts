// @ts-nocheck
/*
 * Shared engine kit for the individual AI-artist project files in this
 * folder — the deterministic primitives the engines draw from, plus the
 * blit boundary wrapper. Factored VERBATIM out of the retired core.ts /
 * core2.ts / index.ts blob (2026-07-03); same convention as ./extra/_kit.
 * Frozen art code — the cast* fns in the project files replay each
 * engine's leading rng draws exactly; do not edit these primitives.
 */
import type {
  EngineFn,
  TraitsFn,
} from '../../../project/types';

export function mulberry32(a){return function(){let t=(a+=0x6d2b79f5);t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
export function rng(seed){return mulberry32(((Math.imul(seed>>>0,2654435761))>>>0)||1);}
export function pick(a,r){return a[Math.floor(r()*a.length)];}
export function rint(r,a,b){return a+Math.floor(r()*(b-a+1));}
export function shuffle(a,r){const x=a.slice();for(let i=x.length-1;i>0;i--){const j=Math.floor(r()*(i+1));const t=x[i];x[i]=x[j];x[j]=t;}return x;}
export function hash2(x,y){let h=0x811c9dc5;const s=x+','+y;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193);}return (h>>>0)/4294967296;}
export function shade(col,amt){const v=parseInt(col.slice(1),16);let R=(v>>16)+amt,G=((v>>8)&255)+amt,B=(v&255)+amt;
  R=Math.max(0,Math.min(255,R));G=Math.max(0,Math.min(255,G));B=Math.max(0,Math.min(255,B));
  return 'rgb('+R+','+G+','+B+')';}
/* deterministic paper mottle */
export function paperNoise(x,r,W,H,dark,n){for(let i=0;i<n;i++){x.fillStyle='rgba('+dark+','+(r()*0.03)+')';x.fillRect(r()*W,r()*H,1.5,1.5);}}
/* Shrink a font until `text` fits `maxW` (down to 55% of base), keeping every
   character. `make(px)` builds the full font string. Pure (no rng draws), so it
   never shifts an engine's deterministic stream. Sets and returns the fitted font. */
export function star(x,cx,cy,R,n){
  x.beginPath();
  for(let i=0;i<n*2;i++){
    const a=i/(n*2)*6.283-1.5708, rr=i%2?R*0.45:R;
    const px=cx+Math.cos(a)*rr, py=cy+Math.sin(a)*rr;
    i===0?x.moveTo(px,py):x.lineTo(px,py);
  }
  x.closePath(); x.fill();
}

/* 15. PACKET — seed packets, guaranteed to grow */
export function hex2rgb(h){const v=parseInt(h.slice(1),16);return [v>>16,(v>>8)&255,v&255];}

/* 24. INTERFERENCE — moiré plates, the image lives between the lines */
export function vnoise2(x,y){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);const a=hash2(xi,yi),b=hash2(xi+1,yi),c=hash2(xi,yi+1),d=hash2(xi+1,yi+1);return (a*(1-u)+b*u)*(1-v)+(c*(1-u)+d*u)*v;}
export function fbm2(x,y,oct){let s=0,a=0.5,n=0,f=1;for(let i=0;i<(oct||5);i++){s+=a*vnoise2(x*f,y*f);n+=a;a*=0.5;f*=2;}return s/n;}
export function rdHexLerp(a,b,t){const va=parseInt(a.slice(1),16),vb=parseInt(b.slice(1),16);const ar=(va>>16)&255,ag=(va>>8)&255,ab=va&255,br=(vb>>16)&255,bg=(vb>>8)&255,bb=vb&255;return 'rgb('+Math.round(ar+(br-ar)*t)+','+Math.round(ag+(bg-ag)*t)+','+Math.round(ab+(bb-ab)*t)+')';}
export function clamp(v,a,b){return v<a?a:v>b?b:v;}
export function h2r(h){const v=parseInt(h.slice(1),16);return [(v>>16)&255,(v>>8)&255,v&255];}
export function r2h(c){const f=n=>('0'+Math.round(clamp(n,0,255)).toString(16)).slice(-2);return '#'+f(c[0])+f(c[1])+f(c[2]);}
export function mix(a,b,t){const A=h2r(a),B=h2r(b);return r2h([A[0]+(B[0]-A[0])*t,A[1]+(B[1]-A[1])*t,A[2]+(B[2]-A[2])*t]);}
export function rgba(h,a){const c=h2r(h);return 'rgba('+c[0]+','+c[1]+','+c[2]+','+a+')';}
export function grain(x,W,H,amt,r){const n=Math.floor(W*H/amt);if(n<=0)return;const NB=8;const paths=new Array(2*NB).fill(null);for(let i=0;i<n;i++){const gi=r()<0.5?0:1;const a=0.015+r()*0.05;const fx=r()*W,fy=r()*H;const bi=Math.min(NB-1,((a-0.015)/0.05*NB)|0);const k=gi*NB+bi;(paths[k]||(paths[k]=new Path2D())).rect(fx,fy,1,1);}for(let k=0;k<2*NB;k++){const p=paths[k];if(!p)continue;const g=k<NB?0:255;x.fillStyle='rgba('+g+','+g+','+g+','+(0.015+((k%NB)+0.5)/NB*0.05)+')';x.fill(p);}}
export function vignette(x,W,H,s){const g=x.createRadialGradient(W/2,H*0.46,Math.min(W,H)*0.25,W/2,H/2,Math.max(W,H)*0.75);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,'+s+')');x.fillStyle=g;x.fillRect(0,0,W,H);}
export function mottle(x,x0,y0,w,h,col,density,r,blend){const n=Math.floor(w*h/density);if(n<=0)return;const NB=8;const paths=new Array(2*NB).fill(null);for(let i=0;i<n;i++){const dark=r()<0.5;const s=0.8+r()*2.2;const a=0.04+r()*0.09;const fx=x0+r()*w,fy=y0+r()*h;const bi=Math.min(NB-1,((a-0.04)/0.09*NB)|0);const k=(dark?0:NB)+bi;(paths[k]||(paths[k]=new Path2D())).rect(fx,fy,s,s);}x.save();x.globalCompositeOperation=blend||'overlay';const cd=mix(col,'#000',0.34),cl=mix(col,'#fff',0.32);for(let k=0;k<2*NB;k++){const p=paths[k];if(!p)continue;x.fillStyle=rgba(k<NB?cd:cl,0.04+((k%NB)+0.5)/NB*0.09);x.fill(p);}x.restore();}
export const PHI=1.61803398875, INVPHI=0.61803398875;

/* Paint via the core engine at native resolution, blit at requested width. */
export function blit(
  raw: (cv: HTMLCanvasElement, seed: number, displayWidth?: number) => void,
  traitsOf: TraitsFn,
): EngineFn {
  return (canvas, tokenId, width) => {
    const off = document.createElement('canvas');
    // Pass the DISPLAY width through so an engine can drop expensive,
    // near-invisible detail (per-mark shadowBlur glow) at thumbnail sizes
    // while keeping it at full-view sizes. Engines that ignore the third
    // arg are unaffected; the full-resolution artwork is byte-identical.
    raw(off, tokenId, Math.max(1, Math.floor(width)));
    const W = Math.max(1, Math.floor(width));
    const H = Math.max(1, Math.round((W * off.height) / off.width));
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.drawImage(off, 0, 0, W, H);
    const aspect = off.width / off.height;
    // Release the full-resolution offscreen's backing store NOW, not whenever
    // GC gets to it. The homepage paints a burst of tiles in one synchronous
    // pass (worse on desktop, where a big viewport queues many at once);
    // without this, each burst stacks dozens of full-size canvases in graphics
    // memory and can crash the GPU process — taking every tab with it. Freeing
    // here keeps at most one native-size canvas alive at any instant.
    off.width = 0;
    off.height = 0;
    return { aspect, traits: traitsOf(tokenId) };
  };
}

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
