import { describe, it, expect, vi, beforeEach } from 'vitest'
import { formatPrice, formatNightlyPrice, formatAED, propertyFromApi, cities, nigerianStates, propertyTypes, purposes } from '@/lib/properties'
import type { PropertyData } from '@/lib/types'

vi.mock('@/lib/settings', () => ({
  getRate: (currency: string) => {
    const rates: Record<string, number> = { NGN: 1, USD: 1 / 1500, GBP: 1 / 1900 }
    return rates[currency] ?? 1
  },
  getCachedSettings: () => ({}),
}))

describe('formatPrice', () => {
  it('formats NGN prices with abbreviations', () => {
    expect(formatPrice(950_000_000)).toBe('₦950M')
    expect(formatPrice(2_800_000_000)).toBe('₦2.80B')
    expect(formatPrice(18_000_000)).toBe('₦18M')
    expect(formatPrice(7_200_000)).toBe('₦7.20M')
    expect(formatPrice(420_000_000)).toBe('₦420M')
    expect(formatPrice(350_000)).toBe('₦350K')
    expect(formatPrice(150)).toBe('₦150')
  })

  it('formats USD prices', () => {
    expect(formatPrice(1_500_000, 'USD')).toBe('$1K')
  })

  it('formats GBP prices', () => {
    expect(formatPrice(1_900_000, 'GBP')).toBe('£1K')
  })

  it('handles zero', () => {
    expect(formatPrice(0)).toBe('₦0')
  })
})

describe('formatNightlyPrice', () => {
  it('appends /night', () => {
    expect(formatNightlyPrice(350_000)).toBe('₦350K/night')
  })
})

describe('formatAED (deprecated alias)', () => {
  it('formats as NGN', () => {
    expect(formatAED(18_000_000)).toBe('₦18M')
  })
})

describe('propertyFromApi', () => {
  const base: PropertyData = {
    id: 1,
    title: 'Test Property',
    type: 'apartment',
    purpose: 'rent',
    price: 18_000_000,
    beds: 2,
    baths: 2,
    area: 110,
    city: 'Lagos',
    community: 'Lekki',
    address: '123 Test St',
    lat: 6.5,
    lng: 3.3,
    description: 'A test property',
    amenities: ['Pool', 'Gym'],
    is_verified: true,
    featured: false,
    images: [
      { url: 'https://example.com/1.jpg' },
      { url: 'https://example.com/2.jpg' },
    ],
  } as PropertyData

  it('maps images to gallery', () => {
    const result = propertyFromApi(base)
    expect(result.gallery).toEqual(['https://example.com/1.jpg', 'https://example.com/2.jpg'])
    expect(result.image).toBe('https://example.com/1.jpg')
  })

  it('uses first image as fallback hero', () => {
    const noImage = { ...base, image: null } as PropertyData
    const result = propertyFromApi(noImage)
    expect(result.image).toBe('https://example.com/1.jpg')
  })

  it('returns null when no images', () => {
    const noImages = { ...base, image: null, images: undefined } as unknown as PropertyData
    const result = propertyFromApi(noImages)
    expect(result.image).toBeNull()
  })

  it('normalises lat/lng to numbers', () => {
    const strCoords = { ...base, lat: '6.5' as any, lng: '3.3' as any }
    const result = propertyFromApi(strCoords)
    expect(typeof result.lat).toBe('number')
    expect(typeof result.lng).toBe('number')
  })

  it('defaults posted_days_ago to 0', () => {
    const result = propertyFromApi(base)
    expect(result.posted_days_ago).toBe(0)
  })
})

describe('constants', () => {
  it('has expected cities', () => {
    expect(cities).toContain('Lagos')
    expect(cities).toContain('Abuja')
  })

  it('has expected property types', () => {
    expect(propertyTypes.map((t) => t.value)).toContain('apartment')
    expect(propertyTypes.map((t) => t.value)).toContain('land')
  })

  it('has expected purposes', () => {
    expect(purposes.map((p) => p.value)).toEqual(['buy', 'rent', 'shortlet'])
  })
})
