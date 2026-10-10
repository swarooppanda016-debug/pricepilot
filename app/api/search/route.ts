import { NextRequest, NextResponse } from 'next/server';
import { mockProducts, type Product } from '../../../lib/products';
import { normalize, analyze } from '../../../lib/engine';

function money(v: unknown) {
  if (typeof v === 'number') return v;
  const n = Number(String(v ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}
function parseShopping(data: any, q: string): Product[] {
  return (data.shopping_results ?? []).slice(0, 40).map((x: any, i: number) => ({
    id: String(x.product_id ?? x.position ?? i),
    store: x.source ?? 'Unknown store',
    title: x.title ?? q,
    price: money(x.extracted_price ?? x.price),
    mrp: money(x.old_price) || undefined,
    rating: typeof x.rating === 'number' ? x.rating : undefined,
    reviews: typeof x.reviews === 'number' ? x.reviews : undefined,
    url: x.link ?? x.product_link ?? '#',
    delivery: x.delivery,
    // SerpApi rarely gives a separate numeric shipping price. Never pretend unknown shipping is free.
    shipping: 0,
    inStock: true,
    features: x.extensions,
    image: x.thumbnail,
    seller: x.source
  })).filter((x: Product) => x.price > 0 && x.url !== '#');
}
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q) return NextResponse.json({ error: 'Enter a product to search.' }, { status: 400 });
  if (q.length > 160) return NextResponse.json({ error: 'Search query is too long.' }, { status: 400 });

  const key = process.env.SERPAPI_KEY;
  if (!key) {
    const products = normalize(mockProducts, q);
    return NextResponse.json({
      query: q, live: false, products, analysis: analyze(products, q),
      warning: 'Demo mode. Add SERPAPI_KEY to enable live Google Shopping results.'
    });
  }
  try {
    const u = new URL('https://serpapi.com/search.json');
    u.searchParams.set('engine', 'google_shopping');
    u.searchParams.set('q', q);
    u.searchParams.set('gl', 'in');
    u.searchParams.set('hl', 'en');
    u.searchParams.set('api_key', key);
    const response = await fetch(u.toString(), { cache: 'no-store', signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error(`Shopping provider returned ${response.status}`);
    const data = await response.json();
    if (data.error) throw new Error('Shopping provider returned an API error');
    const rawProducts = parseShopping(data, q);
    const products = normalize(rawProducts, q);
    return NextResponse.json({
      query: q, live: true, products, offersReceived: rawProducts.length,
      offersCompared: products.length,
      analysis: analyze(products, q),
      provider: 'Google Shopping via SerpApi',
      ...(products.length === 0 ? { warning: 'Live data arrived, but no sufficiently relevant products passed matching checks. Try the exact model name. Accessory and weak matches were excluded.' } : {})
    });
  } catch {
    const products = normalize(mockProducts, q);
    return NextResponse.json({
      query: q, live: false, products, analysis: analyze(products, q),
      warning: 'Live shopping search failed. Demo data is shown as a fallback; do not treat it as current market pricing.'
    });
  }
}
