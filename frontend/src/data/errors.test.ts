import { describe, expect, it } from 'vitest'

import { HttpStatusError, describeDataError } from './errors'

describe('describeDataError', () => {
  it('maps common HTTP status codes to stable UI titles', () => {
    expect(
      describeDataError(new HttpStatusError(401, 'Session expired.'), 'Artifacts unavailable.'),
    ).toEqual({
      title: 'Authentication required.',
      description: 'Session expired.',
    })

    expect(
      describeDataError(new HttpStatusError(404, 'Artifact not found.'), 'Artifacts unavailable.'),
    ).toEqual({
      title: 'Resource not found.',
      description: 'Artifact not found.',
    })

    expect(
      describeDataError(new HttpStatusError(409, 'Version conflict.'), 'Artifacts unavailable.'),
    ).toEqual({
      title: 'Version or state conflict.',
      description: 'Version conflict.',
    })
  })

  it('falls back to the supplied title for non-http errors', () => {
    expect(describeDataError(new Error('Query failed.'), 'Artifacts unavailable.')).toEqual({
      title: 'Artifacts unavailable.',
      description: 'Query failed.',
    })
  })
})
