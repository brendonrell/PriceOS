// Server-injected first-paint of a profile's OWNER colour.
//
// The global prehydration script in app/layout.tsx paints a profile page the
// brand-default grey (#E0E0E0) on first paint, because that script runs in
// <head> before any per-profile server data exists — it literally cannot see
// the owner's profile_hex (see the profileBoot branch + its comment there).
// ColorwayContext then repaints the real colour once React mounts, which is
// the grey-flash-then-owner-colour you see when cold-opening someone's profile.
//
// But the colour DOES live in the DB and the profile page already fetches it
// server-side. So we hand it to the first paint directly: the profile page
// renders this tiny script at the top of its body output. Being a synchronous
// inline script in the body, it runs AFTER the head boot script (overriding the
// grey) and BEFORE the page content paints — so the very first frame is already
// the owner's colour. No flash, even on a cold load or hard refresh.
//
// The variable writes below MIRROR paintVars(bg, text, key=null) in
// app/layout.tsx's prehydration script (the profile/custom path uses no 'dark'
// overrides). Keep the two in lockstep if that painter changes.

const HEX_RE = /^#[0-9A-F]{6}$/i;

/**
 * Returns the inline-script source that paints `hex` as the owner colour, or
 * null when `hex` is missing/invalid (caller then renders nothing and the
 * existing grey-default boot path stands).
 *
 * The script no-ops when the viewer has an explicit colorway pick saved
 * (light/dark/orange/…): that pick still wins, exactly as ColorwayContext
 * decides post-hydration. Only the default/Custom slot inherits the owner hue.
 */
export function profileColorBootScript(hex: string | null | undefined): string | null {
  if (!hex || !HEX_RE.test(hex)) return null;
  const bg = hex.toUpperCase();
  // bg is validated to /^#[0-9A-F]{6}$/ — safe to inline as a string literal.
  return `(function(){try{
var bg="${bg}";
var saved=null;try{saved=localStorage.getItem('pd_settings_colorway');}catch(e){}
if(saved==='hashsyn')saved=null;
if(saved!==null&&saved!=='custom')return;
var h=bg.replace('#','');
var r=parseInt(h.substr(0,2),16)||0,g=parseInt(h.substr(2,2),16)||0,b=parseInt(h.substr(4,2),16)||0;
var text=(((r*299)+(g*587)+(b*114))/1000)>=128?'#111111':'#e0e0e0';
var isLight=text==='#111111';
var s=document.documentElement.style;
s.setProperty('--bg-color',bg);
s.setProperty('--text-color',text);
s.setProperty('--accent',text);
s.setProperty('--border-color',isLight?'rgba(0,0,0,0.15)':'rgba(255,255,255,0.15)');
s.setProperty('--stat-bg',isLight?'rgba(0,0,0,0.08)':'rgba(255,255,255,0.18)');
s.setProperty('--stat-active-bg',isLight?'#000000':'#e0e0e0');
s.setProperty('--stat-active-text',isLight?'#e0e0e0':'#000000');
s.setProperty('--modal-bg','rgba('+r+','+g+','+b+',0.98)');
s.setProperty('--btn-user-hover',isLight?'#ffffff':'#888888');
s.setProperty('--mint-bg','#111111');
s.setProperty('--mint-text','#e0e0e0');
s.setProperty('--mint-border','#111111');
s.setProperty('--mint-bg-img','none');
s.setProperty('--pill-l1-bg',text);
s.setProperty('--pill-l1-text',bg);
s.setProperty('--pill-l1-border',text);
s.setProperty('--pill-l1-bg-img','none');
s.setProperty('--pill-l1-active-bg-img','none');
var tcm=document.getElementById('theme-color-meta');if(tcm)tcm.setAttribute('content',bg);
if(document.body&&r>g+40&&r>b+40&&r>100)document.body.classList.add('bg-is-red');
if(document.body&&r>b+40&&g>b+40&&r>120&&g>120)document.body.classList.add('bg-is-yellow');
}catch(e){}})();`;
}
