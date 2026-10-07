import { NextRequest, NextResponse } from 'next/server';
import { mockProducts, type Product } from '../../../lib/products';
import { normalize, analyze } from '../../../lib/engine';

function money(v:any){if(typeof v==='number')return v; const n=Number(String(v??'').replace(/[^0-9.]/g,'')); return Number.isFinite(n)?n:0;}
function parseShopping(d:any,q:string):Product[]{
 return (d.shopping_results??[]).slice(0,40).map((x:any,i:number)=>({
  id:String(i), store:x.source??'Unknown store', title:x.title??q, price:money(x.price), mrp:money(x.old_price)||undefined,
  rating:typeof x.rating==='number'?x.rating:undefined, reviews:typeof x.reviews==='number'?x.reviews:undefined,
  url:x.link??x.product_link??'#', delivery:x.delivery, shipping:0, inStock:true, features:x.extensions, image:x.thumbnail, seller:x.source
 })).filter((x:Product)=>x.price>0);
}
export async function GET(req:NextRequest){
 const q=req.nextUrl.searchParams.get('q')?.trim();
 if(!q)return NextResponse.json({error:'Enter a product to search.'},{status:400});
 const key=process.env.SERPAPI_KEY;
 if(!key){const products=normalize(mockProducts,q);return NextResponse.json({query:q,live:false,products,analysis:analyze(products,q),warning:'Demo mode. Add SERPAPI_KEY to enable live Google Shopping results.'});}
 try{
  const u=new URL('https://serpapi.com/search.json');
  u.searchParams.set('engine','google_shopping');u.searchParams.set('q',q);u.searchParams.set('gl','in');u.searchParams.set('hl','en');u.searchParams.set('api_key',key);
  const r=await fetch(u.toString(),{cache:'no-store'}); if(!r.ok)throw new Error(`Provider ${r.status}`);
  const products=normalize(parseShopping(await r.json(),q),q);
  return NextResponse.json({query:q,live:true,products,analysis:analyze(products,q),provider:'Google Shopping via SerpApi'});
 }catch(e){const products=normalize(mockProducts,q);return NextResponse.json({query:q,live:false,products,analysis:analyze(products,q),warning:'Live provider failed; showing demo data.'});}
}
