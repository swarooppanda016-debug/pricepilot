'use client';
import {useEffect,useMemo,useState} from 'react';
import {Search, ExternalLink, ShieldCheck, Sparkles, Bell, TrendingDown, Star, CheckCircle2, Zap, Smartphone, Laptop, Headphones, Home, Shirt, ChevronRight, Menu, Heart, GitCompareArrows} from 'lucide-react';
import type {NormalizedProduct} from '../lib/products';

type Result={query:string;live:boolean;products:NormalizedProduct[];analysis:{summary:string;best:string|null;pros:string[];cons:string[];recommendations:{title:string;text:string;id:string}[]};warning?:string};
const money=(n:number)=>`₹${n.toLocaleString('en-IN')}`;
const categories=[['Mobiles',Smartphone,'iPhone 17'],['Laptops',Laptop,'Laptop under ₹60000'],['Audio',Headphones,'Sony headphones'],['Home',Home,'Air purifier'],['Fashion',Shirt,'Running shoes']];
const popular=['iPhone 17','Samsung Galaxy S25 256GB','AirPods Pro','Sony WH-1000XM6','Laptop under ₹60000'];

export default function Home(){
 const [q,setQ]=useState('');const [r,setR]=useState<Result|null>(null);const [loading,setLoading]=useState(false);const [sort,setSort]=useState('value');const [target,setTarget]=useState('');const [watching,setWatching]=useState<string[]>([]);const [menu,setMenu]=useState(false);
 useEffect(()=>{try{setWatching(JSON.parse(localStorage.getItem('pricepilot:watches')||'[]'))}catch{}} ,[]);
 const search=async(v=q)=>{if(!v.trim())return;setQ(v);setLoading(true);try{const x=await fetch('/api/search?q='+encodeURIComponent(v));setR(await x.json())}catch{setR(null)}finally{setLoading(false)}};
 const products=useMemo(()=>[...(r?.products??[])].sort((a,b)=>sort==='price'?a.finalPrice-b.finalPrice:sort==='rating'?(b.rating??0)-(a.rating??0):b.valueScore-a.valueScore),[r,sort]);
 function watch(){if(!q.trim()||!target)return;const next=[...new Set([...watching,`${q}|${target}`])];setWatching(next);localStorage.setItem('pricepilot:watches',JSON.stringify(next));setTarget('');}
 return <main>
  <div className="topline"><div className="wrap topline-inner"><span>🇮🇳 Built for Indian shoppers</span><span>Compare prices · Discover value · Save more</span></div></div>
  <div className="wrap">
   <header className="nav">
    <button className="mobile-menu" onClick={()=>setMenu(!menu)} aria-label="Menu"><Menu size={21}/></button>
    <button className="logo" onClick={()=>{setR(null);setQ('')}}><img src="/pricepilot-logo.png" alt="PricePilot"/></button>
    <nav className={menu?'open':''}><a href="#compare">Compare</a><a href="#categories">Categories</a><a href="#how">How it works</a><a href="#alerts">Price alerts</a></nav>
    <button className="saved"><Heart size={17}/> Saved</button>
   </header>

   {!r ? <>
    <section className="hero-home">
      <div className="pill"><Zap size={14}/> Smart shopping starts here</div>
      <h1>Don't overpay.<br/><span>Compare before you buy.</span></h1>
      <p>Search once and see prices, ratings, delivery, pros, cons and our best-value recommendation across shopping sites.</p>
      <div className="search big"><Search size={20} className="search-icon"/><input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&search()} placeholder="What are you looking for? e.g. Samsung Galaxy S25"/><button onClick={()=>search()} disabled={loading}>{loading?'Searching…':'Compare prices'}<ChevronRight size={18}/></button></div>
      <div className="popular"><span>Popular:</span>{popular.map(x=><button key={x} onClick={()=>search(x)}>{x}</button>)}</div>
      <div className="trust"><span><ShieldCheck size={16}/> Price + delivery comparison</span><span><GitCompareArrows size={16}/> Same-product matching</span><span><Sparkles size={16}/> Smart recommendations</span></div>
    </section>
    <section id="categories" className="section"><div className="section-head"><div><span className="kicker">SHOP SMART</span><h2>Browse by category</h2></div><button className="text-btn">View all <ChevronRight size={16}/></button></div><div className="cat-grid">{categories.map(([name,Icon,query])=>{const I=Icon as any;return <button className="cat" key={name as string} onClick={()=>search(query as string)}><span className="cat-icon"><I size={23}/></span><span>{name as string}</span><ChevronRight size={16}/></button>})}</div></section>
    <section id="how" className="section how"><div className="section-head"><div><span className="kicker">HOW IT WORKS</span><h2>One search. Better decision.</h2></div></div><div className="steps"><div><b>01</b><Search/><h3>Search</h3><p>Enter the exact product, model or a natural shopping request.</p></div><div><b>02</b><GitCompareArrows/><h3>Compare</h3><p>See offers side-by-side with final price, ratings and match quality.</p></div><div><b>03</b><Sparkles/><h3>Choose</h3><p>Get the cheapest option, best-value pick and useful alternatives.</p></div></div></section>
    <section className="deal-banner"><div><span className="kicker">PRICEPILOT PROMISE</span><h2>Cheapest isn't always the best deal.</h2><p>We weigh price, product match, ratings and review confidence to surface a more useful recommendation.</p></div><div className="deal-badge"><TrendingDown size={20}/><strong>Save smarter</strong><span>not just cheaper</span></div></section>
   </> : <section id="compare" className="results">
    <div className="result-search search"><Search size={18}/><input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&search()}/><button onClick={()=>search()} disabled={loading}>{loading?'Searching…':'Search'}</button></div>
    <div className="toolbar"><div><div className="kicker">COMPARISON RESULTS</div><h2>{r.query}</h2><div className="muted">{r.live?'● Live shopping results':'○ Demo mode — add SERPAPI_KEY for live results'} · {r.products.length} offers</div></div><select className="select" value={sort} onChange={e=>setSort(e.target.value)}><option value="value">Best value first</option><option value="price">Lowest final price</option><option value="rating">Highest rating</option></select></div>{r.warning&&<div className="notice">{r.warning}</div>}
    <section className="winner"><div><div className="eyebrow">🏆 OUR RECOMMENDATION</div><h2>{r.products.find(x=>x.id===r.analysis.best)?.title||r.query}</h2><p>{r.analysis.summary}</p></div><div className="score">{r.products.find(x=>x.id===r.analysis.best)?.valueScore||0}<small>/100<br/>value</small></div></section>
    <div className="result-label"><span>{products.length} offers compared</span><span>Final price = item + shipping</span></div>
    <section className="grid">{products.map((p)=><article className={`card ${p.id===r.analysis.best?'best':''}`} key={p.id}>{p.id===r.analysis.best&&<div className="ribbon">BEST VALUE</div>}<div className="store"><span>{p.store}</span>{p.inStock!==false&&<small>In stock</small>}</div><div className="title">{p.title}</div><div><span className="price">{money(p.finalPrice)}</span>{p.mrp&&p.mrp>p.price&&<><span className="old">{money(p.mrp)}</span><span className="discount">{p.discountPct}% off</span></>}</div><div className="meta">{p.rating&&<span><Star size={14} fill="currentColor"/> {p.rating} {p.reviews?`(${p.reviews.toLocaleString('en-IN')})`:''}</span>}<span>Match {p.matchScore}%</span></div><div className="muted">{p.delivery||'Check delivery'} {p.shipping?`· +${money(p.shipping)} shipping`:''}</div><div className="valuebar"><span style={{width:`${p.valueScore}%`}}></span></div><div className="value-label">Value score <b>{p.valueScore}/100</b></div><a className="buy" href={p.url} target="_blank" rel="noreferrer">View deal <ExternalLink size={15}/></a></article>)}</section>
    <section className="two"><div className="panel"><h2><CheckCircle2 size={20}/> Advantages</h2><ul className="clean">{r.analysis.pros.map(x=><li key={x}>{x}</li>)}</ul></div><div className="panel"><h2><ShieldCheck size={20}/> Before buying</h2><ul className="clean">{r.analysis.cons.map(x=><li key={x}>{x}</li>)}</ul></div></section>
    <section className="panel"><h2><Sparkles size={20}/> Smart suggestions</h2>{r.analysis.recommendations.map(x=><div className="rec" key={x.id}><strong>{x.title}</strong><span>{x.text}</span></div>)}</section>
    <section id="alerts" className="panel watch"><div><h2><Bell size={20}/> Price-drop watch</h2><p className="muted">Set your target price. This MVP saves it in your browser; a production backend can send email, WhatsApp or push alerts.</p></div><div className="watchrow"><input type="number" placeholder="Target price e.g. 70000" value={target} onChange={e=>setTarget(e.target.value)}/><button onClick={watch}>Track price</button></div>{watching.length>0&&<div className="watched">Tracking: {watching.join(' • ')}</div>}</section>
   </section>}
   <footer className="footer"><div className="footer-brand"><img src="/pricepilot-logo.png" alt="PricePilot"/><span>Compare. Choose. Save.</span></div><p>Verify final checkout price, seller, warranty and return policy before purchase.</p></footer>
  </div>
  <div className="bottom-nav"><button onClick={()=>{setR(null);window.scrollTo({top:0,behavior:'smooth'})}}><Search size={18}/><span>Search</span></button><button onClick={()=>document.getElementById('categories')?.scrollIntoView({behavior:'smooth'})}><Home size={18}/><span>Categories</span></button><button onClick={()=>document.getElementById('alerts')?.scrollIntoView({behavior:'smooth'})}><Bell size={18}/><span>Alerts</span></button></div>
 </main>
}
