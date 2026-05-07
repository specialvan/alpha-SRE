import { describe, expect, it } from 'vitest'

import { HttpStatusError, describeDataError } from './errors'

describe('describeDataError', () => {
  it('maps common HTTP status codes to stable UI titles', () => {
    expect(
      describeDataError(new HttpStatusError(401, 'Session expired.'), 'Artifacts unavailable.'),
    ).toEqual({
      title: '需要身份认证。',
      description: 'Session expired.',
    })

    expect(
      describeDataError(new HttpStatusError(404, 'Artifact not found.'), 'Artifacts unavailable.'),
    ).toEqual({
      title: '资源未找到。',
      description: 'Artifact not found.',
    })

    expect(
      describeDataError(new HttpStatusError(409, 'Version conflict.'), 'Artifacts unavailable.'),
    ).toEqual({
      title: '版本或状态冲突。',
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
