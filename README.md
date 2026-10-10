# PricePilot

**Compare. Choose. Save.**

A Next.js product comparison MVP for Indian shoppers. Search a product, compare offers, see final price + shipping, product-match quality, value score, pros/cons and buying suggestions.

## V4 homepage
- Branded PricePilot logo
- Commercial-style landing page
- Popular searches
- Category browsing
- How-it-works section
- Smart-shopping promise
- Mobile bottom navigation
- Responsive comparison results

## Live results
Add `SERPAPI_KEY` to `.env.local` to enable Google Shopping results through SerpApi.

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Matching quality update
- Filters common accessories from main-product searches (e.g. cases, covers, chargers and screen protectors).
- Applies a relevance threshold and a variant mismatch penalty before value scoring.
- Keeps low-match offers from winning the recommendation solely because of rating or discount.
- Displays product images when supplied by Google Shopping.
- Shows an explicit no-reliable-matches message instead of presenting weak matches as trustworthy.
- The match score is heuristic and cannot guarantee exact SKU, condition, seller authenticity or warranty. Verify merchant details and checkout price.

## Production roadmap
1. Licensed merchant feeds / affiliate APIs
2. Exact SKU/variant matching
3. Price history database
4. Email/WhatsApp/push price alerts
5. User accounts and saved products
6. Coupons and checkout-price normalization
7. Review summarization with citations
8. Affiliate tracking and merchant analytics


## V8 matching safeguards

- Model identifier mismatches (for example, iPhone 17 vs iPhone 17e) are not included in the main recommendation pool.
- Related/different models are returned separately as `alternatives` and labelled clearly in the UI.
- Storage capacity mismatch is treated as a variant, not an exact match.
- Best-value and cheapest labels distinguish exact-model results from close variants.
- No API secrets are included in this source package. Keep `SERPAPI_KEY` configured only in Vercel Environment Variables.

This is heuristic matching, not a guarantee of exact SKU, region, condition or seller authenticity. Test results before production rollout.


## V10 model identity safeguards

- Treats model-line modifiers (Pro, Pro Max, Air, Mini, Plus, Ultra, FE, etc.) as part of product identity.
- Keeps different model numbers and model lines out of the main Best Value ranking.
- Requires a requested storage capacity to be present in the listing.
- Accessory-specific searches filter out host devices; normal device searches filter out accessories.
- Similar-model listings may still be returned by the provider, but must not win the main recommendation.
- Matching remains heuristic. Check seller, exact SKU, warranty, currency, shipping and checkout price before purchase.
