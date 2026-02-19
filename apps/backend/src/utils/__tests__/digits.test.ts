import { describe, it, expect } from 'vitest'
import { normalizeDigitsToEnglish } from '../digits.js'

describe('normalizeDigitsToEnglish', () => {
  it('converts Persian digits', () => {
    expect(normalizeDigitsToEnglish('۱۲۳۴۵۶۷۸۹۰')).toBe('1234567890')
  })

  it('converts Arabic digits', () => {
    expect(normalizeDigitsToEnglish('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789')
  })

  it('keeps ascii digits', () => {
    expect(normalizeDigitsToEnglish('2026-02-18')).toBe('2026-02-18')
  })
})
