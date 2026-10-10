export type Product = {
  id: string; store: string; title: string; price: number; mrp?: number; rating?: number;
  reviews?: number; url: string; delivery?: string; shipping?: number; inStock?: boolean;
  features?: string[]; image?: string; seller?: string;
};

export type NormalizedProduct = Product & {
  finalPrice: number; discountPct: number; matchScore: number; valueScore: number;
  matchType: 'exact' | 'variant' | 'alternative';
};

export const mockProducts: Product[] = [
 {id:'amz-1',store:'Amazon',title:'Samsung Galaxy S25 5G 256GB',price:74999,mrp:80999,rating:4.5,reviews:1820,url:'https://www.amazon.in/',delivery:'Free delivery',shipping:0,inStock:true,features:['AMOLED','5G','256GB']},
 {id:'flip-1',store:'Flipkart',title:'Samsung Galaxy S25 5G 256 GB',price:73999,mrp:80999,rating:4.4,reviews:2310,url:'https://www.flipkart.com/',delivery:'Free delivery',shipping:0,inStock:true,features:['AMOLED','5G','256GB']},
 {id:'croma-1',store:'Croma',title:'Samsung Galaxy S25 5G 256GB',price:75999,mrp:80999,rating:4.3,reviews:620,url:'https://www.croma.com/',delivery:'Delivery available',shipping:0,inStock:true,features:['AMOLED','5G','256GB']},
 {id:'reliance-1',store:'Reliance Digital',title:'Samsung Galaxy S25 5G 256GB',price:76990,mrp:80999,rating:4.4,reviews:410,url:'https://www.reliancedigital.in/',delivery:'Delivery available',shipping:0,inStock:true,features:['AMOLED','5G','256GB']}
];
