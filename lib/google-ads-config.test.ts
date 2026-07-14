import { describe, expect, it } from 'vitest'
import { DEFAULT_META_AD_ACCOUNT_ID } from './meta-ads-config'

describe('config type modules', () => {
  it('exports default Meta ad account id constant', () => {
    expect(DEFAULT_META_AD_ACCOUNT_ID).toMatch(/^act_/)
  })
})
