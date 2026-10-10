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
function modelIdentifiers(s: string) {
  const normalized = clean(s);
  // Model identifiers with digits are especially important: iPhone 17 vs 17e,
  // Galaxy S25 vs S24, and WH-1000XM6 vs XM5 must not be merged.
  return normalized.match(/\b(?:[a-z]{0,5}\d{1,5}[a-z]{0,3}|\d{1,5}[a-z]{0,3})\b/g) ?? [];
}
function modelFamilyMismatch(query: string, title: string) {
  const q = modelIdentifiers(query), t = modelIdentifiers(title);
  if (!q.length || !t.length) return false;
  // Compare identifiers only where the same product family is present.
  const qClean = clean(query), tClean = clean(title);
  const familyWords = ['iphone','galaxy','pixel','ipad','macbook','airpods','wh'];
  const sharedFamily = familyWords.some(w => qClean.includes(w) && tClean.includes(w));
  if (!sharedFamily) return false;
  return q.some(id => {
    const sameNumberDifferentSuffix = t.some(other => {
      const a = id.match(/^(\d+)([a-z]*)$/), b = other.match(/^(\d+)([a-z]*)$/);
      return !!a && !!b && a[1] === b[1] && a[2] !== b[2];
    });
    const identifierMissing = !t.includes(id) && !sameNumberDifferentSuffix;
    return sameNumberDifferentSuffix || identifierMissing;
  });
}
function capacityMismatch(query: string, title: string) {
  const q = clean(query), t = clean(title);
  const capacities = ['64gb','128gb','256gb','512gb','1tb','2tb'];
  const qCaps = capacities.filter(x => q.includes(x));
  const tCaps = capacities.filter(x => t.includes(x));
  return qCaps.length > 0 && (!tCaps.length || !qCaps.some(x => tCaps.includes(x)));
}
function classifyMatch(query: string, title: string, score: number): 'exact'|'variant'|'alternative' {
  if (modelFamilyMismatch(query, title)) return 'alternative';
  if (capacityMismatch(query, title)) return 'variant';
  const q = clean(query), t = clean(title);
  const qColors = ['black','white','blue','green','pink','silver','gold','titanium','purple','red'];
  if (qColors.some(c => q.split(' ').includes(c)) && !qColors.some(c => q.split(' ').includes(c) && t.split(' ').includes(c))) return 'variant';
  return score >= 70 ? 'exact' : 'variant';
}
export function normalize(items: Product[], query: string): NormalizedProduct[] {
  return items
    .filter(x => x.price > 0 && !isAccessory(x.title, query))
    .map(x => {
      const finalPrice = x.price + (x.shipping || 0);
      const discountPct = x.mrp && x.mrp > x.price ? Math.round((1 - x.price / x.mrp) * 100) : 0;
      const rawMatch = matchScore(query, x.title);
      const matchType = classifyMatch(query, x.title, rawMatch);
      const penalty = variantPenalty(query, x.title) + (matchType === 'alternative' ? 35 : 0);
      const match = Math.max(0, rawMatch - penalty);
      const rating = x.rating || 0;
      const reviewConfidence = Math.min(1, Math.log10((x.reviews || 0) + 1) / 4);
      // Price/reviews cannot overpower poor identity matching.
      const valueScore = match < 45 || matchType === 'alternative' ? 0 : Math.round(Math.max(0, Math.min(100,
        match * 0.58 + (rating / 5) * 20 + reviewConfidence * 7 + Math.min(discountPct, 50) / 50 * 8 + (x.shipping === 0 ? 3 : 0)
      )));
      return { ...x, finalPrice, discountPct, matchScore: match, valueScore, matchType };
    })
    .filter(x => x.matchType === 'alternative' || x.matchScore >= 35)
    .sort((a, b) => b.valueScore - a.valueScore || a.finalPrice - b.finalPrice);
}
export function analyze(items: NormalizedProduct[], q: string) {
  if (!items.length) return {
    summary: `We couldn't find reliable exact or close variant offers for “${q}”. Similar models may be available separately. Try the full model name or remove a storage/color detail.`,
    best: null as string | null, pros: [] as string[],
    cons: ['No sufficiently close product matches were found.','Different models are not ranked as exact matches.','Verify model, seller, warranty and checkout price before buying.'],
    recommendations: [] as {title:string;text:string;id:string}[]
  };
  const exact = items.filter(x => x.matchType === 'exact' && x.matchScore >= 70);
  const pool = exact.length ? exact : items.filter(x => x.matchType === 'variant' && x.matchScore >= 45);
  const ranked = pool.length ? pool : items;
  const best = [...ranked].sort((a,b) => b.valueScore-a.valueScore || a.finalPrice-b.finalPrice)[0];
  const cheapest = [...ranked].sort((a,b) => a.finalPrice-b.finalPrice)[0];
  const avg = Math.round(ranked.reduce((sum,x) => sum+x.finalPrice,0)/ranked.length);
  const savings = Math.max(0, avg-cheapest.finalPrice);
  return {
    summary: `${exact.length ? 'Exact-model offers are available' : 'No high-confidence exact-model offer was found; these are close variants'}. ${best.store} has the strongest ${exact.length ? 'exact-match' : 'variant'} value score. Lowest listed price in this group: ₹${cheapest.finalPrice.toLocaleString('en-IN')} at ${cheapest.store}; average: ₹${avg.toLocaleString('en-IN')}.`,
    best: best.id,
    pros: [`Compared ${ranked.length} ${exact.length ? 'exact/strong' : 'close-variant'} offers`,`Best-value score: ${best.valueScore}/100`,`Lowest listed price in this group is ₹${cheapest.finalPrice.toLocaleString('en-IN')}`],
    cons: ['Prices, coupons, stock and delivery can change at checkout','Seller, warranty and return terms may differ','Match score is an estimate, not proof of identical SKU or condition'],
    recommendations: [
      {title: exact.length ? '🏆 Best exact-model value' : '🏆 Best close variant', text:`${best.store} — ₹${best.finalPrice.toLocaleString('en-IN')}`, id:best.id},
      {title:'💰 Lowest listed price in this group', text:`${cheapest.store} — ₹${cheapest.finalPrice.toLocaleString('en-IN')}`, id:cheapest.id},
      ...ranked.filter(x=>x.id!==best.id&&x.id!==cheapest.id).slice(0,2).map(x=>({title:'🔎 Alternative',text:`${x.store} — ₹${x.finalPrice.toLocaleString('en-IN')}`,id:x.id}))
    ]
  };
}
