const { chromium } = require('playwright-core');
const DIR='/home/user/PriceOS/.artcheck';
const projects=[{slug:'boreal',ids:[1,2,3,7]},{slug:'reliquary',ids:[1,2,3,7]}];
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_EXEC});
 const page=await b.newPage({viewport:{width:520,height:900},deviceScaleFactor:1});
 for(const proj of projects){
  const datas=[];
  for(const id of proj.ids){
   await page.goto(`http://localhost:3252/art/${proj.slug}/${id}`,{waitUntil:'networkidle',timeout:60000});
   await page.waitForTimeout(1800);
   datas.push(await page.evaluate(()=>{const c=document.querySelector('#gallery canvas');return c&&c.width>2?c.toDataURL('image/png'):null;}));
  }
  await page.setContent('<body style="margin:0;background:#222"><canvas id="m" width="820" height="820"></canvas></body>');
  await page.evaluate(async(datas)=>{const cv=document.getElementById('m'),x=cv.getContext('2d');x.fillStyle='#222';x.fillRect(0,0,820,820);const cells=[[5,5],[415,5],[5,415],[415,415]];await Promise.all(datas.map((d,i)=>new Promise(res=>{if(!d)return res();const im=new Image();im.onload=()=>{x.drawImage(im,cells[i][0],cells[i][1],400,400);res();};im.onerror=()=>res();im.src=d;})));},datas);
  await page.waitForTimeout(200);
  await page.locator('#m').screenshot({path:`${DIR}/${proj.slug}.png`});
  console.log('saved',proj.slug,datas.filter(Boolean).length,'/',proj.ids.length);
 }
 await b.close();
})();
