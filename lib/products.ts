import type { MeterName } from './billing';

export type BillingCycle = 'monthly' | 'six_months' | 'annual' | 'one_time';
export type ProductKind = 'subscription' | 'addon';
export type ProductKey =
  | 'creation_tools'
  | 'creation_tools_pro'
  | 'teaching_tools'
  | 'creation_pack_75'
  | 'grading_pack_150';

export type Product = {
  key: ProductKey;
  name: string;
  kind: ProductKind;
  priceCents: number;
  cycle: BillingCycle;
  meter: MeterName;
  included: number;
  description: string;
};

export const PRODUCTS: Product[] = [
  {
    key: 'creation_tools',
    name: 'Creation Tools',
    kind: 'subscription',
    priceCents: 1595,
    cycle: 'monthly',
    meter: 'creation',
    included: 100,
    description: '100 page creations per month',
  },
  {
    key: 'creation_tools_pro',
    name: 'Creation Tools Pro',
    kind: 'subscription',
    priceCents: 2995,
    cycle: 'monthly',
    meter: 'creation',
    included: 250,
    description: '250 page creations per month',
  },
  {
    key: 'teaching_tools',
    name: 'Teaching Tools',
    kind: 'subscription',
    priceCents: 975,
    cycle: 'monthly',
    meter: 'teaching',
    included: 400,
    description: '400 graded assignments per month',
  },
  {
    key: 'creation_pack_75',
    name: 'Extra Creation Pack',
    kind: 'addon',
    priceCents: 1000,
    cycle: 'one_time',
    meter: 'creation',
    included: 75,
    description: '75 extra page creations',
  },
  {
    key: 'grading_pack_150',
    name: 'Extra Grading Pack',
    kind: 'addon',
    priceCents: 1000,
    cycle: 'one_time',
    meter: 'teaching',
    included: 150,
    description: '150 extra graded papers',
  },
];

export function formatPrice(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export function productByKey(key: string) {
  return PRODUCTS.find(product => product.key === key);
}
