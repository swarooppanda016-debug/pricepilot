import type { Product, NormalizedProduct } from './products';

const STOP = new Set([
  'the','and','with','for','from','new','buy','best','price','online','offer','in','of',
  'at','to','a','an','on','by','under','over','upto','up','down','latest','india'
]);

const ACCESSORY_TERMS = [
  'case','cover','screen protector','tempered glass','protector','charger','charging cable',
  'usb cable','cable','adapter','power adapter','earbuds case','replacement tip','strap',
  'band for','watch band','watch strap','skin','sticker','decal','holder','mount','stand',
  'tripod','lens protector','camera protector','camera lens','battery replacement',
  'replacement battery','keyboard cover','sleeve','pouch','back cover','bumper','stylus tip',
  'remote cover','controller skin','cleaning kit','repair kit','spare part','replacement part'
];
const ACCESSORY_CONTEXT = /\b(for|compatible with|fits|fit for|case for|cover for|protector for)\b/i;

function clean(s: string) {
  return s.toLowerCase()
    .replace(/(\d+)\s*(gb|tb|mb|inch|inches|mm|cm|mah|hz)\b/g, '$1$2')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
function tokens(s: string) {
  return new Set(clean(s).split(/\s+/).filter(x => x && !STOP.has(x)));
}
function containsPhrase(title: string, phrase: string) {
  return (` ${clean(title)} `).includes(` ${clean(phrase)} `);
}
export function isAccessory(title: string, query: string) {
  const t = clean(title);
  const q = clean(query);
  const matched = ACCESSORY_TERMS.some(term => containsPhrase(t, term));
  if (!matched) return false;
  // If the query itself explicitly requests an accessory, don't exclude it.
  const queryAsksAccessory = ACCESSORY_TERMS.some(term => containsPhrase(q, term));
  if (queryAsksAccessory) return false;
  // Accessories often repeat the searched device name; that must not make them a product match.
  return true;
}
export function matchScore(query: string, title: string) {
  const q = tokens(query), t = tokens(title);
  if (!q.size || !t.size) return 0;
  let hit = 0;
  q.forEach(x => { if (t.has(x)) hit++; });
  const recall = hit / q.size;
  const precision = hit / Math.max(1, t.size);
  // Query terms matter most; precision prevents long accessory/irrelevant titles scoring highly.
  return Math.round(Math.min(100, recall * 82 + precision * 18));
}
function variantPenalty(query: string, title: string) {
  const q = clean(query), t = clean(title);
  let penalty = 0;
  const capacities = ['64gb','128gb','256gb','512gb','1tb','2tb'];
  const qCaps = capacities.filter(x => q.includes(x));
  const tCaps = capacities.filter(x => t.includes(x));
  if (qCaps.length && !qCaps.some(x => t.includes(x))) penalty += 22;
  else if (qCaps.length && tCaps.some(x => !qCaps.includes(x))) penalty += 10;
  const qColors = ['black','white','blue','green','pink','silver','gold','titanium','purple','red'];
  const qColorsFound = qColors.filter(x => q.split(' ').includes(x));
  if (qColorsFound.length && !qColorsFound.some(x => t.split(' ').includes(x))) penalty += 8;
  return penalty;
}
export function normalize(items: Product[], query: string): NormalizedProduct[] {
  const valid = items
    .filter(x => x.price > 0 && !isAccessory(x.title, query))
    .map(x => {
      const finalPrice = x.price + (x.shipping || 0);
      const discountPct = x.mrp && x.mrp > x.price ? Math.round((1 - x.price / x.mrp) * 100) : 0;
      const rawMatch = matchScore(query, x.title);
      const match = Math.max(0, rawMatch - variantPenalty(query, x.title));
      const rating = x.rating || 0;
      const reviewConfidence = Math.min(1, Math.log10((x.reviews || 0) + 1) / 4);
      // Don't let rating/discount overpower a weak product match.
      const valueScore = match < 45 ? 0 : Math.round(Math.max(0, Math.min(100,
        match * 0.58 + (rating / 5) * 20 + reviewConfidence * 7 + Math.min(discountPct, 50) / 50 * 8 + (x.shipping === 0 ? 3 : 0)
      )));
      return { ...x, finalPrice, discountPct, matchScore: match, valueScore };
    })
    .filter(x => x.matchScore >= 35);
  return valid.sort((a, b) => b.valueScore - a.valueScore || a.finalPrice - b.finalPrice);
}
export function analyze(items: NormalizedProduct[], q: string) {
  if (!items.length) return {
    summary: `We couldn't find reliable matching offers for “${q}”. Try the full model name or remove a color/storage detail.`,
    best: null as string | null, pros: [] as string[],
    cons: ['No sufficiently close product matches were found.','Try a more specific model name; verify variant, seller and checkout price.'],
    recommendations: [] as {title:string;text:string;id:string}[]
  };
  const reliable = items.filter(x => x.matchScore >= 55);
  const pool = reliable.length ? reliable : items;
  const best = pool[0];
  const cheapest = [...pool].sort((a,b) => a.finalPrice - b.finalPrice)[0];
  const avg = Math.round(pool.reduce((s,x) => s + x.finalPrice, 0) / pool.length);
  const savings = Math.max(0, avg - cheapest.finalPrice);
  return {
    summary: `${best.store} has the strongest overall match and value score among ${pool.length} relevant offer${pool.length===1?'':'s'}. Lowest listed price: ₹${cheapest.finalPrice.toLocaleString('en-IN')} at ${cheapest.store}; average listed price among these offers: ₹${avg.toLocaleString('en-IN')}.`,
    best: best.id,
    pros: [`Compared ${pool.length} relevant seller offer${pool.length===1?'':'s'}`, `Best-value score: ${best.valueScore}/100`, `Lowest listed price is ₹${cheapest.finalPrice.toLocaleString('en-IN')}`],
    cons: ['Prices, stock, coupons and delivery can change at checkout','Seller, warranty and return terms may differ','A matching score is an estimate, not a guarantee of identical SKU or condition'],
    recommendations: [
      {title:'🏆 Best overall match', text:`${best.store} — ₹${best.finalPrice.toLocaleString('en-IN')}`, id:best.id},
      {title:'💰 Lowest listed price', text:`${cheapest.store} — ₹${cheapest.finalPrice.toLocaleString('en-IN')}`, id:cheapest.id},
      ...pool.filter(x=>x.id!==best.id&&x.id!==cheapest.id).slice(0,2).map(x=>({title:'🔎 Alternative',text:`${x.store} — ₹${x.finalPrice.toLocaleString('en-IN')}`,id:x.id}))
    ]
  };
}
