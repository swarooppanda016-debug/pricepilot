import type { Product, NormalizedProduct } from './products';

const STOP = new Set(['the','and','with','for','from','new','buy','best','price','online','offer','in','of']);
function tokens(s:string){return new Set(s.toLowerCase().replace(/[^a-z0-9]+/g,' ').split(/\s+/).filter(x=>x&&!STOP.has(x)));}
export function matchScore(query:string,title:string){
 const q=tokens(query), t=tokens(title); if(!q.size||!t.size)return 0;
 let hit=0; q.forEach(x=>{if(t.has(x))hit++});
 return Math.round((hit/q.size)*100);
}
export function normalize(items:Product[], query:string):NormalizedProduct[]{
 const valid=items.filter(x=>x.price>0).map(x=>{
  const finalPrice=x.price+(x.shipping||0);
  const discountPct=x.mrp&&x.mrp>x.price?Math.round((1-x.price/x.mrp)*100):0;
  const match=matchScore(query,x.title);
  const rating=x.rating||0;
  const reviewConfidence=Math.min(1,Math.log10((x.reviews||0)+1)/4);
  const valueScore=Math.round(Math.max(0, Math.min(100, match*.45 + (rating/5)*30 + reviewConfidence*10 + (discountPct/50)*15)));
  return {...x,finalPrice,discountPct,matchScore:match,valueScore};
 });
 return valid.sort((a,b)=>b.valueScore-a.valueScore || a.finalPrice-b.finalPrice);
}
export function analyze(items:NormalizedProduct[], q:string){
 if(!items.length)return {summary:`No matching offers were found for “${q}”.`,best:null,pros:[],cons:['Try the exact model number or storage size.'],recommendations:[]};
 const best=items[0], cheapest=[...items].sort((a,b)=>a.finalPrice-b.finalPrice)[0];
 const avg=Math.round(items.reduce((s,x)=>s+x.finalPrice,0)/items.length);
 const savings=Math.max(0,Math.round(items.reduce((s,x)=>s+Math.max(0,avg-x.finalPrice),0)/items.length));
 return {
  summary:`${best.store} is the best overall value for “${q}”. The lowest final listed price is ₹${cheapest.finalPrice.toLocaleString('en-IN')} at ${cheapest.store}; average listed price is ₹${avg.toLocaleString('en-IN')}.`,
  best:best.id,
  pros:[`Compared ${items.length} seller offers`,`Best-value score: ${best.valueScore}/100`,`Potential average saving: ₹${savings.toLocaleString('en-IN')}`],
  cons:['Prices, coupons, stock and delivery can change at checkout','Seller, warranty and return terms can differ','Search matching is strongest when the model/storage/variant is specified'],
  recommendations:[
   {title:'🏆 Best overall',text:`${best.store} — ₹${best.finalPrice.toLocaleString('en-IN')}`,id:best.id},
   {title:'💰 Cheapest',text:`${cheapest.store} — ₹${cheapest.finalPrice.toLocaleString('en-IN')}`,id:cheapest.id},
   ...items.filter(x=>x.id!==best.id&&x.id!==cheapest.id).slice(0,2).map(x=>({title:'🔎 Alternative',text:`${x.store} — ₹${x.finalPrice.toLocaleString('en-IN')}`,id:x.id}))
  ]
 };
}
