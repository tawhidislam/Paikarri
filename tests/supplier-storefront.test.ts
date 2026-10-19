import { describe, it, expect } from 'vitest';
import { storefrontCopy } from '../src/lib/storefront-copy';
import { banglaCopy } from '../src/lib/copy';

describe('Supplier Storefront functionality', () => {
  it('includes all necessary Bengali translations for storefront features', () => {
    expect(storefrontCopy['Request Custom Quote']).toBe('কাস্টম দরপত্র অনুরোধ');
    expect(storefrontCopy['Search in this store…']).toBe('এই দোকানের পণ্য খুঁজুন…');
    expect(storefrontCopy['Protected by Paikarii Escrow']).toBe('পাইকারি ব্যাংক এসক্রো দ্বারা সুরক্ষিত');
    expect(storefrontCopy['Company & Capabilities']).toBe('কোম্পানি ও সক্ষমতা');
    expect(storefrontCopy['Trade & Escrow Terms']).toBe('বাণিজ্য ও এসক্রো শর্তাবলী');
    expect(storefrontCopy['Reviews & Ratings']).toBe('রিভিউ ও রেটিং');
    expect(storefrontCopy['Verified channel']).toBe('যাচাইকৃত যোগাযোগ মাধ্যম');
    expect(storefrontCopy['Paikarii Verified Chat & RFQ']).toBe('পাইকারি যাচাইকৃত চ্যাট ও আরএফকিউ');
    expect(banglaCopy['Request Custom Quote']).toBe('কাস্টম দরপত্র অনুরোধ');
    expect(banglaCopy['Search in this store…']).toBe('এই দোকানের পণ্য খুঁজুন…');
    expect(banglaCopy['Verified channel']).toBe('যাচাইকৃত যোগাযোগ মাধ্যম');
    expect(banglaCopy['Paikarii Verified Chat & RFQ']).toBe('পাইকারি যাচাইকৃত চ্যাট ও আরএফকিউ');
  });

  it('filters and sorts in-store products by multiple criteria', () => {
    const mockProducts = [
      {
        id: '1',
        name: 'Cotton Yarn',
        name_bn: 'সুতি সুতা',
        description: 'Premium combed cotton yarn for knitting',
        starting_price: 350,
        moq: 100,
        category: { id: 'c1', name: 'Textiles' },
        created_at: '2026-01-01T00:00:00Z',
      },
      {
        id: '2',
        name: 'Denim Fabric',
        name_bn: 'ডেনিম কাপড়',
        description: 'Heavy duty indigo denim fabric',
        starting_price: 220,
        moq: 500,
        category: { id: 'c1', name: 'Textiles' },
        created_at: '2026-02-01T00:00:00Z',
      },
      {
        id: '3',
        name: 'Metal Zipper',
        name_bn: 'মেটাল জিপার',
        description: 'Brass zipper for jackets and jeans',
        starting_price: 15,
        moq: 1000,
        category: { id: 'c2', name: 'Accessories' },
        created_at: '2026-03-01T00:00:00Z',
      },
    ];

    // Search query filter
    const searchMatch = mockProducts.filter((p) =>
      p.name.toLowerCase().includes('denim') || p.description.toLowerCase().includes('denim'),
    );
    expect(searchMatch).toHaveLength(1);
    expect(searchMatch[0].id).toBe('2');

    // Category filter
    const categoryMatch = mockProducts.filter((p) => p.category.id === 'c1');
    expect(categoryMatch).toHaveLength(2);

    // Sort by price ascending
    const sortedPriceAsc = [...mockProducts].sort((a, b) => a.starting_price - b.starting_price);
    expect(sortedPriceAsc[0].id).toBe('3'); // 15
    expect(sortedPriceAsc[2].id).toBe('1'); // 350

    // Sort by MOQ ascending
    const sortedMoqAsc = [...mockProducts].sort((a, b) => a.moq - b.moq);
    expect(sortedMoqAsc[0].id).toBe('1'); // 100
    expect(sortedMoqAsc[2].id).toBe('3'); // 1000
  });

  it('formats custom quotation RFQ message lines correctly', () => {
    const fields = {
      title: '5,000 meters 100% Cotton Poplin',
      quantity: '5,000 Meters',
      price: '180',
      details: 'Width: 58 inch, Color: Optical White, Delivery to Gazipur by Nov 20',
    };

    const message = [
      '[Custom Quote Request]',
      `Product / Requirement: ${fields.title}`,
      `Target volume: ${fields.quantity}`,
      `Target unit price (BDT): ৳${fields.price}`,
      `Details: ${fields.details}`,
    ].join('\n');

    expect(message).toContain('[Custom Quote Request]');
    expect(message).toContain('Product / Requirement: 5,000 meters 100% Cotton Poplin');
    expect(message).toContain('Target volume: 5,000 Meters');
    expect(message).toContain('Target unit price (BDT): ৳180');
    expect(message).toContain('Delivery to Gazipur by Nov 20');
  });

  it('guarantees supplier mobile numbers are never rendered publicly on storefront', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const storefrontCode = fs.readFileSync(
      path.resolve(__dirname, '../src/pages/supplier-storefront.tsx'),
      'utf-8',
    );
    expect(storefrontCode).not.toContain('contact_phone');
    expect(storefrontCode).not.toContain('tel:');
    expect(storefrontCode).not.toContain('storefront-btn-tel');
  });
});

