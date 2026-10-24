// Documents use a conservative quality floor to keep fine print readable.
export const imageUploadProfiles = {
  'store-images': {
    maxDimension: 512,
    quality: 0.84,
    minimumQuality: 0.72,
    targetBytes: 120 * 1024,
  },
  'chat-images': {
    maxDimension: 1600,
    quality: 0.8,
    minimumQuality: 0.65,
    targetBytes: 450 * 1024,
  },
  'product-images': {
    maxDimension: 1920,
    quality: 0.84,
    minimumQuality: 0.76,
    targetBytes: 600 * 1024,
  },
  avatars: { maxDimension: 512, quality: 0.84, minimumQuality: 0.76, targetBytes: 120 * 1024 },
  'request-attachments': {
    maxDimension: 2400,
    quality: 0.9,
    minimumQuality: 0.84,
    targetBytes: 1000 * 1024,
  },
  'business-documents': {
    maxDimension: 3200,
    quality: 0.94,
    minimumQuality: 0.9,
    targetBytes: 1500 * 1024,
  },
} as const;
