import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
const kit = readFileSync(resolve('tools/halo/kit.js'),'utf8');
const engine = readFileSync(resolve('tools/halo/king/p_glass.js'),'utf8');
const browser = await chromium.launch({executablePath: process.env.PW_EXEC});
const page = await browser.newPage();
await page.setContent('<!doctype html><html><body></body></html>');
await page.addScriptTag({content:kit});
await page.addScriptTag({content:engine});
const url = await page.evaluate(()=>{
  KIT.bloom=()=>{};KIT.sheen=()=>{};KIT.grain=()=>{};KIT.chromaSplit=()=>{};KIT.mottle=()=>{};
  const cv=document.createElement('canvas');cv.width=820;cv.height=820;
  window.ENGINE.draw(cv,3);
  return cv.toDataURL('image/png');
});
writeFileSync('tools/halo/king/out/GLASS/_probe.png',Buffer.from(url.split(',')[1],'base64'));
console.log('probe saved');
await browser.close();
