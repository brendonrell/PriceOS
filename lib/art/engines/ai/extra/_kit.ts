// @ts-nocheck
/*
 * Shared engine kit for the `extra` AI sample engines (2026-06-19 cohort).
 * Same deterministic primitives as core.ts / core2.ts, factored out so each
 * new engine file is self-contained but the helpers stay identical. Plain JS
 * under @ts-nocheck by design — frozen art code, same convention as the cores.
 */
export function mulberry32(a){return function(){let t=(a+=0x6d2b79f5);t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
export function rng(seed){return mulberry32(((Math.imul(seed>>>0,2654435761))>>>0)||1);}
export function pick(a,r){return a[Math.floor(r()*a.length)];}
export function rint(r,a,b){return a+Math.floor(r()*(b-a+1));}
export function shuffle(a,r){const x=a.slice();for(let i=x.length-1;i>0;i--){const j=Math.floor(r()*(i+1));const t=x[i];x[i]=x[j];x[j]=t;}return x;}
export function randn(r){return r()+r()+r()+r()-2;}
export function clamp(v,a,b){return v<a?a:v>b?b:v;}
export function h2r(h){const v=parseInt(h.slice(1),16);return [(v>>16)&255,(v>>8)&255,v&255];}
export function r2h(c){const f=n=>('0'+Math.round(clamp(n,0,255)).toString(16)).slice(-2);return '#'+f(c[0])+f(c[1])+f(c[2]);}
export function mix(a,b,t){const A=h2r(a),B=h2r(b);return r2h([A[0]+(B[0]-A[0])*t,A[1]+(B[1]-A[1])*t,A[2]+(B[2]-A[2])*t]);}
export function lum(h){const c=h2r(h);return (0.2126*c[0]+0.7152*c[1]+0.0722*c[2])/255;}
export function rgba(h,a){const c=h2r(h);return 'rgba('+c[0]+','+c[1]+','+c[2]+','+a+')';}
export function hsl2hex(h,s,l){h=((h%360)+360)%360;s=clamp(s,0,1);l=clamp(l,0,1);const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2;let R=0,G=0,B=0;if(h<60){R=c;G=x;}else if(h<120){R=x;G=c;}else if(h<180){G=c;B=x;}else if(h<240){G=x;B=c;}else if(h<300){R=x;B=c;}else{R=c;B=x;}return r2h([(R+m)*255,(G+m)*255,(B+m)*255]);}
export function grain(x,W,H,amt,r){const n=Math.floor(W*H/amt);for(let i=0;i<n;i++){const g=r()<0.5?0:255;x.fillStyle='rgba('+g+','+g+','+g+','+(0.015+r()*0.05)+')';x.fillRect(r()*W,r()*H,1,1);}}
export function vignette(x,W,H,s){const g=x.createRadialGradient(W/2,H*0.46,Math.min(W,H)*0.25,W/2,H/2,Math.max(W,H)*0.75);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,'+s+')');x.fillStyle=g;x.fillRect(0,0,W,H);}
export function paperTooth(x,W,H,r){x.save();x.globalCompositeOperation='overlay';for(let i=0;i<W*H/240;i++){const g=r()<0.5?0:255;x.fillStyle='rgba('+g+','+g+','+g+','+(r()*0.06)+')';x.fillRect(r()*W,r()*H,1.3,1.3);}x.restore();}
export function mottle(x,x0,y0,w,h,col,density,r,blend){x.save();x.globalCompositeOperation=blend||'overlay';const n=Math.floor(w*h/density);for(let i=0;i<n;i++){const dark=r()<0.5;const c=dark?mix(col,'#000',0.34):mix(col,'#fff',0.32);const s=0.8+r()*2.2;x.fillStyle=rgba(c,0.04+r()*0.09);x.fillRect(x0+r()*w,y0+r()*h,s,s);}x.restore();}
export const PHI=1.61803398875, INVPHI=0.61803398875;

/* ── extended atmosphere/texture kit (halo cohort 2026-06-28) — ported from the
   R&D kit so production engines get haze, fbm noise, bloom, sheen, metal. ── */
export function makeNoise(seed){
  const r=rng(seed);
  const perm=new Uint8Array(512);
  const p=new Uint8Array(256);
  for(let i=0;i<256;i++)p[i]=i;
  for(let i=255;i>0;i--){const j=Math.floor(r()*(i+1));const t=p[i];p[i]=p[j];p[j]=t;}
  for(let i=0;i<512;i++)perm[i]=p[i&255];
  function fade(t){return t*t*t*(t*(t*6-15)+10);}
  function lerp(a,b,t){return a+(b-a)*t;}
  function grad(h,x,y){const u=(h&1)?x:-x,v=(h&2)?y:-y;return u+v;}
  function noise2(x,y){
    const X=Math.floor(x)&255,Y=Math.floor(y)&255;
    x-=Math.floor(x);y-=Math.floor(y);
    const u=fade(x),v=fade(y);
    const aa=perm[perm[X]+Y],ab=perm[perm[X]+Y+1],ba=perm[perm[X+1]+Y],bb=perm[perm[X+1]+Y+1];
    return lerp(lerp(grad(aa,x,y),grad(ba,x-1,y),u),lerp(grad(ab,x,y-1),grad(bb,x-1,y-1),u),v);
  }
  function fbm(x,y,oct,gain,lac){oct=oct||4;gain=gain||0.5;lac=lac||2;let a=0,f=1,amp=0.5,n=0;for(let i=0;i<oct;i++){a+=amp*noise2(x*f,y*f);n+=amp;amp*=gain;f*=lac;}return a/n;}
  return {noise2,fbm};
}
export function bloom(x,cx,cy,rad,col,a0){x.save();x.globalCompositeOperation='lighter';const g=x.createRadialGradient(cx,cy,0,cx,cy,rad);g.addColorStop(0,rgba(col,a0));g.addColorStop(1,rgba(col,0));x.fillStyle=g;x.fillRect(cx-rad,cy-rad,rad*2,rad*2);x.restore();}
export function hazeSheet(x,W,H,noise,col,opacity,scale,blend){
  x.save();x.globalCompositeOperation=blend||'screen';
  const step=Math.max(3,Math.floor(Math.min(W,H)/180));
  const c=h2r(col);
  for(let yy=0;yy<H;yy+=step){for(let xx=0;xx<W;xx+=step){
    const n=(noise.fbm(xx/scale,yy/scale,5,0.55,2.1)+1)/2;
    const a=clamp(n*n*opacity,0,1);
    if(a<0.01)continue;
    x.fillStyle='rgba('+c[0]+','+c[1]+','+c[2]+','+a+')';
    x.fillRect(xx,yy,step+1,step+1);
  }}
  x.restore();
}
export function scanlines(x,W,H,gap,a){x.save();x.globalCompositeOperation='multiply';x.fillStyle='rgba(0,0,0,'+a+')';for(let y=0;y<H;y+=gap){x.fillRect(0,y,W,1);}x.restore();}
export function iridescent(phase,sat,light){const h=((phase*360)%360+360)%360;return hsl2hex(h,sat==null?0.85:sat,light==null?0.6:light);}
export function sheen(x,cx,cy,rad,col,a0){x.save();x.globalCompositeOperation='lighter';const g=x.createRadialGradient(cx,cy,0,cx,cy,rad);g.addColorStop(0,rgba(col,a0));g.addColorStop(0.4,rgba(col,a0*0.35));g.addColorStop(1,rgba(col,0));x.fillStyle=g;x.fillRect(cx-rad,cy-rad,rad*2,rad*2);x.restore();}
export function curl(noise,x,y,eps){eps=eps||1;const n1=noise.fbm((x)/100,(y+eps)/100,4),n2=noise.fbm((x)/100,(y-eps)/100,4);const n3=noise.fbm((x+eps)/100,(y)/100,4),n4=noise.fbm((x-eps)/100,(y)/100,4);return [(n1-n2)/(2*eps),-(n3-n4)/(2*eps)];}
export function softShadow(x,cx,cy,rad,a){x.save();x.globalCompositeOperation='multiply';const g=x.createRadialGradient(cx,cy,0,cx,cy,rad);g.addColorStop(0,'rgba(0,0,0,'+a+')');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(cx-rad,cy-rad,rad*2,rad*2);x.restore();}
export function chromeRamp(x,x0,y0,w,h,ang,base){const cx=x0+w/2,cy=y0+h/2,L=Math.max(w,h);const dx=Math.cos(ang)*L,dy=Math.sin(ang)*L;const g=x.createLinearGradient(cx-dx/2,cy-dy/2,cx+dx/2,cy+dy/2);g.addColorStop(0,mix(base,'#05060a',0.55));g.addColorStop(0.32,mix(base,'#ffffff',0.55));g.addColorStop(0.46,mix(base,'#06070c',0.35));g.addColorStop(0.6,mix(base,'#ffffff',0.85));g.addColorStop(0.78,mix(base,'#04050a',0.6));g.addColorStop(1,mix(base,'#ffffff',0.4));return g;}
export function chromaSplit(x,W,H,off){try{const img=x.getImageData(0,0,W,H);const d=img.data;const out=x.createImageData(W,H);const o=out.data;const dx=off|0;for(let y=0;y<H;y++){for(let i=0;i<W;i++){const idx=(y*W+i)*4;const rx=Math.min(W-1,i+dx),bx=Math.max(0,i-dx);o[idx]=d[(y*W+rx)*4];o[idx+1]=d[idx+1];o[idx+2]=d[(y*W+bx)*4+2];o[idx+3]=255;}}x.putImageData(out,0,0);}catch(e){}}

/* Paint via a raw engine at native resolution, blit at requested width — the
   exact contract used by core engines (lib/art/engines/ai/index.ts). */
export function blit(raw, traitsOf){
  return (canvas, tokenId, width) => {
    const off = document.createElement('canvas');
    raw(off, tokenId);
    const W = Math.max(1, Math.floor(width));
    const H = Math.max(1, Math.round((W * off.height) / off.width));
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.drawImage(off, 0, 0, W, H);
    return { aspect: off.width / off.height, traits: traitsOf(tokenId) };
  };
}
