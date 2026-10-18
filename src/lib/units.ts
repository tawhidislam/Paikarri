type Locale = 'en' | 'bn';
type Unit = { en: [string, string]; bn: string };
const units: Record<string, Unit> = {
  piece: { en: ['piece', 'pieces'], bn: 'টি' },
  box: { en: ['box', 'boxes'], bn: 'বাক্স' },
  kg: { en: ['kg', 'kg'], bn: 'কেজি' },
  g: { en: ['g', 'g'], bn: 'গ্রাম' },
  tonne: { en: ['tonne', 'tonnes'], bn: 'টন' },
  litre: { en: ['litre', 'litres'], bn: 'লিটার' },
  metre: { en: ['metre', 'metres'], bn: 'মিটার' },
  dozen: { en: ['dozen', 'dozen'], bn: 'ডজন' },
  set: { en: ['set', 'sets'], bn: 'সেট' },
  pair: { en: ['pair', 'pairs'], bn: 'জোড়া' },
  pack: { en: ['pack', 'packs'], bn: 'প্যাক' },
  packet: { en: ['packet', 'packets'], bn: 'প্যাকেট' },
  carton: { en: ['carton', 'cartons'], bn: 'কার্টন' },
  bag: { en: ['bag', 'bags'], bn: 'ব্যাগ' },
  roll: { en: ['roll', 'rolls'], bn: 'রোল' },
};
const aliases: Record<string, string> = {
  pieces: 'piece',
  pcs: 'piece',
  pc: 'piece',
  boxes: 'box',
  kilogram: 'kg',
  kilograms: 'kg',
  kgs: 'kg',
  gram: 'g',
  grams: 'g',
  ton: 'tonne',
  tons: 'tonne',
  tonnes: 'tonne',
  l: 'litre',
  liter: 'litre',
  liters: 'litre',
  litres: 'litre',
  m: 'metre',
  meter: 'metre',
  meters: 'metre',
  metres: 'metre',
  sets: 'set',
  pairs: 'pair',
  packs: 'pack',
  packets: 'packet',
  cartons: 'carton',
  bags: 'bag',
  rolls: 'roll',
};
export function formatUnit(unit: string, quantity = 1, locale: Locale = 'en') {
  const normalized = unit.trim().toLowerCase();
  const entry = units[aliases[normalized] ?? normalized];
  if (!entry) return unit.trim();
  return locale === 'bn' ? entry.bn : entry.en[quantity === 1 ? 0 : 1];
}
export function formatQuantity(quantity: number, unit: string, locale: Locale = 'en') {
  return `${new Intl.NumberFormat(locale === 'bn' ? 'bn-BD' : 'en-BD').format(quantity)} ${formatUnit(unit, quantity, locale)}`;
}
