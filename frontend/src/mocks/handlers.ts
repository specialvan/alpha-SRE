import { HttpResponse, http } from 'msw'

import { mockIndex, mockRawArtifacts } from './catalog'

export const handlers = [
  http.get('/api/mock/index', () => {
    return HttpResponse.json(mockIndex)
  }),
  http.get('/api/mock/artifact', ({ request }) => {
    const url = new URL(request.url)
    const path = url.searchParams.get('path') ?? ''
    const payload = mockRawArtifacts[path]

    if (!payload) {
      return new HttpResponse(null, { status: 404 })
    }

    return HttpResponse.json(payload)
  }),
]
