import { NextRequest, NextResponse } from 'next/server';
export async function GET(req:NextRequest){
 const q=req.nextUrl.searchParams.get('q')||'Product'; const now=Date.now();
 const points=Array.from({length:30},(_,i)=>{const d=new Date(now-(29-i)*86400000);const base=74999;const wave=Math.sin(i/3)*1200;return {date:d.toISOString().slice(0,10),price:Math.round(base+wave-(i>21?900:0))};});
 return NextResponse.json({query:q,source:'demo',points});
}
