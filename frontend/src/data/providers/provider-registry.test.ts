import { describe, expect, it } from 'vitest'

import { getRuntimeProvider } from './provider-registry'

describe('provider registry', () => {
  it('keeps mock mode available outside dev/test by returning the seeded mock provider', async () => {
    const provider = getRuntimeProvider('mock', {
      dev: false,
      mode: 'production',
    })

    const overview = await provider.getOverview()

    expect(overview.reviewSampleCount).toBeGreaterThan(0)
    expect(overview.activity.length).toBeGreaterThan(0)
  })
})
