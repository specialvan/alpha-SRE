const statusTitles: Record<number, string> = {
  401: 'Authentication required.',
  403: 'Permission denied.',
  404: 'Resource not found.',
  409: 'Version or state conflict.',
  422: 'Validation failed.',
  500: 'Backend request failed.',
}

export class HttpStatusError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'HttpStatusError'
    this.status = status
  }
}

function errorMessage(error: unknown, fallbackTitle: string) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallbackTitle
}

function errorStatus(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number'
  ) {
    return error.status
  }

  return null
}

export function describeDataError(error: unknown, fallbackTitle: string) {
  const status = errorStatus(error)

  return {
    title: status ? (statusTitles[status] ?? fallbackTitle) : fallbackTitle,
    description: errorMessage(error, fallbackTitle),
  }
}

async function responseErrorMessage(response: Response) {
  try {
    const contentType = response.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      const payload = (await response.json()) as Record<string, unknown>
      const message = payload.message ?? payload.error ?? payload.detail
      if (typeof message === 'string' && message.trim()) {
        return message
      }
    } else {
      const text = await response.text()
      if (text.trim()) {
        return text
      }
    }
  } catch {
    // Fall through to the default message.
  }

  return `${response.status} ${response.statusText}`.trim()
}

export async function fetchJsonOrThrow<T>(input: RequestInfo | URL) {
  const response = await fetch(input)

  if (!response.ok) {
    throw new HttpStatusError(response.status, await responseErrorMessage(response))
  }

  return response.json() as Promise<T>
}
