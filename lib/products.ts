export type BillingCycle = 'monthly' | 'six_months' | 'annual' | 'one_time';
export type ProductKind = 'ai_credit';
export type ProductKey = 'ai_credit_pack';

export type Product = {
  key: ProductKey;
  name: string;
  kind: ProductKind;
  priceCents: number;
  cycle: BillingCycle;
  meter: 'ai';
  included: number;
  description: string;
};

export const PRODUCTS: Product[] = [
  {
    key: 'ai_credit_pack',
    name: 'AI Credits',
    kind: 'ai_credit',
    priceCents: 2000,
    cycle: 'one_time',
    meter: 'ai',
    included: 250,
    description: '250 non-transferable AI credits for grading, pages, or quizzes',
  },
];

export function formatPrice(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export function productByKey(key: string) {
  return PRODUCTS.find(product => product.key === key);
}
