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
  return normalized.match(/\b(?:[a-z]{0,5}\d{1,5}[a-z]{0,3}|\d{1,5}[a-z]{0,3})\b/g) ?? [];
}
const FAMILIES = ['iphone','galaxy','pixel','ipad','macbook','airpods','wh','playstation','xbox','thinkpad','vivobook','redmi','poco','oneplus'];
function familyPresent(s: string) {
  const v = clean(s);
  return FAMILIES.find(f => (` ${v} `).includes(` ${f} `)) ?? '';
}
function modelFamilyMismatch(query: string, title: string) {
  const q = clean(query), t = clean(title);
  const qFamily = familyPresent(q), tFamily = familyPresent(t);
  if (qFamily && tFamily && qFamily !== tFamily) return true;
  if (!qFamily || !tFamily || qFamily !== tFamily) return false;
  const qIds = modelIdentifiers(q).filter(id => !/^(64|128|256|512|1024|2048)(gb|tb)?$/.test(id));
  const tIds = modelIdentifiers(t).filter(id => !/^(64|128|256|512|1024|2048)(gb|tb)?$/.test(id));
  if (!qIds.length) return false;
  // A model identifier must be present exactly; 17 and 17e are different models.
  return qIds.some(id => !tIds.includes(id));
}
function capacityMismatch(query: string, title: string) {
  const q = clean(query), t = clean(title);
  const capacities = ['64gb','128gb','256gb','512gb','1tb','2tb'];
  const qCaps = capacities.filter(x => q.includes(x));
  const tCaps = capacities.filter(x => t.includes(x));
  return qCaps.length > 0 && (!tCaps.length || !qCaps.some(x => tCaps.includes(x)));
}
function colorMismatch(query: string, title: string) {
  const q = clean(query), t = clean(title);
  const colors = ['black','white','blue','green','pink','silver','gold','titanium','purple','red','gray','grey','midnight','starlight'];
  const requested = colors.filter(c => q.split(' ').includes(c));
  return requested.length > 0 && !requested.some(c => t.split(' ').includes(c));
}
function queryRequestsAccessory(query: string) {
  return ACCESSORY_TERMS.some(term => containsPhrase(query, term));
}
function titleIsMainProductForAccessoryQuery(title: string, query: string) {
  // When the user searches for an accessory, keep accessory listings and reject the host device itself.
  if (!queryRequestsAccessory(query)) return false;
  const q = clean(query), t = clean(title);
  const requested = ACCESSORY_TERMS.filter(term => containsPhrase(q, term));
  return requested.length > 0 && !requested.some(term => containsPhrase(t, term));
}
function classifyMatch(query: string, title: string, score: number): 'exact'|'variant'|'alternative' {
  if (modelFamilyMismatch(query, title)) return 'alternative';
  if (capacityMismatch(query, title) || colorMismatch(query, title)) return 'variant';
  const qFamily = familyPresent(query), tFamily = familyPresent(title);
  if (qFamily && tFamily && qFamily !== tFamily) return 'alternative';
  return score >= 62 ? 'exact' : 'variant';
}
export function normalize(items: Product[], query: string): NormalizedProduct[] {
  const accessoryQuery = queryRequestsAccessory(query);
  return items
    .filter(x => x.price > 0 && (accessoryQuery ? !titleIsMainProductForAccessoryQuery(x.title, query) : !isAccessory(x.title, query)))
    .map(x => {
      const finalPrice = x.price + (x.shipping || 0);
      const discountPct = x.mrp && x.mrp > x.price ? Math.round((1 - x.price / x.mrp) * 100) : 0;
      const rawMatch = matchScore(query, x.title);
      const matchType = classifyMatch(query, x.title, rawMatch);
      const penalty = variantPenalty(query, x.title) + (matchType === 'alternative' ? 35 : 0);
      const match = Math.max(0, rawMatch - penalty);
      const rating = x.rating || 0;
      const reviewConfidence = Math.min(1, Math.log10((x.reviews || 0) + 1) / 4);
      const eligible = matchType !== 'alternative' && match >= 45;
      const valueScore = !eligible ? 0 : Math.round(Math.max(0, Math.min(100,
        match * 0.58 + (rating / 5) * 20 + reviewConfidence * 7 + Math.min(discountPct, 50) / 50 * 8 + (x.shipping === 0 ? 3 : 0)
      )));
      return { ...x, finalPrice, discountPct, matchScore: match, valueScore, matchType };
    })
    .filter(x => x.matchType === 'alternative' || x.matchScore >= 45)
    .sort((a, b) => (a.matchType === 'alternative' ? 1 : 0) - (b.matchType === 'alternative' ? 1 : 0) || b.valueScore - a.valueScore || a.finalPrice - b.finalPrice);
}
export function analyze(items: NormalizedProduct[], q: string) {
  const exact = items.filter(x => x.matchType === 'exact' && x.matchScore >= 70);
  const variants = items.filter(x => x.matchType === 'variant' && x.matchScore >= 45);
  const ranked = exact.length ? exact : variants;
  if (!ranked.length) return {
    summary: `We couldn't find reliable exact-model or close-variant offers for “${q}”. Different models may be available in Similar Alternatives below. Try the full model name or remove a storage/color detail.`,
    best: null as string | null, pros: [] as string[],
    cons: ['No sufficiently close product matches were found.','Similar models are excluded from the main recommendation.','Verify model, seller, warranty and checkout price before buying.'],
    recommendations: [] as {title:string;text:string;id:string}[]
  };
  const best = [...ranked].sort((a,b) => b.valueScore-a.valueScore || a.finalPrice-b.finalPrice)[0];
  const cheapest = [...ranked].sort((a,b) => a.finalPrice-b.finalPrice)[0];
  const avg = Math.round(ranked.reduce((sum,x) => sum+x.finalPrice,0)/ranked.length);
  return {
    summary: `${exact.length ? 'Exact-model offers are available' : 'No high-confidence exact-model offer was found; showing close variants'}. ${best.store} has the strongest ${exact.length ? 'exact-model' : 'variant'} value score. Lowest listed price in this group: ₹${cheapest.finalPrice.toLocaleString('en-IN')} at ${cheapest.store}; average: ₹${avg.toLocaleString('en-IN')}. Shipping may not be included unless explicitly provided.`,
    best: best.id,
    pros: [`Compared ${ranked.length} ${exact.length ? 'exact-model' : 'close-variant'} offers`,`Best-value score: ${best.valueScore}/100`,`Lowest listed price in this group is ₹${cheapest.finalPrice.toLocaleString('en-IN')}`],
    cons: ['Prices, coupons, stock and delivery can change at checkout','Seller, warranty and return terms may differ','Match score is heuristic and does not prove identical SKU or condition'],
    recommendations: [
      {title: exact.length ? '🏆 Best exact-model value' : '🏆 Best close-variant value', text:`${best.store} — ₹${best.finalPrice.toLocaleString('en-IN')}`, id:best.id},
      {title:'💰 Lowest listed price in this group', text:`${cheapest.store} — ₹${cheapest.finalPrice.toLocaleString('en-IN')}`, id:cheapest.id},
      ...ranked.filter(x=>x.id!==best.id&&x.id!==cheapest.id).slice(0,2).map(x=>({title:'🔎 Exact/variant offer',text:`${x.store} — ₹${x.finalPrice.toLocaleString('en-IN')}`,id:x.id}))
    ]
  };
}
