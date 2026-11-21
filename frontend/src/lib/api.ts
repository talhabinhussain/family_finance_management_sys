const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

type QueryValue = string | number | boolean | null | undefined

type ValidationError = {
  loc?: Array<string | number>
  msg?: string
}

export class ApiError extends Error {
  status: number
  fieldErrors?: Record<string, string>

  constructor(message: string, status: number, fieldErrors?: Record<string, string>) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

function buildUrl(path: string, params?: Record<string, QueryValue>) {
  const url = new URL(path, API_BASE_URL)

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value))
    }
  })

  return url.toString()
}

async function request<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
  params?: Record<string, QueryValue>
): Promise<T> {
  let response: Response

  try {
    response = await fetch(buildUrl(path, params), {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError("The backend is unavailable. Please try again.", 0)
  }

  if (!response.ok) {
    let payload: { detail?: string | ValidationError[] } | undefined
    try {
      payload = (await response.json()) as { detail?: string | ValidationError[] }
    } catch {
      payload = undefined
    }

    if (Array.isArray(payload?.detail)) {
      const fieldErrors: Record<string, string> = {}
      payload.detail.forEach((error) => {
        const field = error.loc?.at(-1)
        if (typeof field === "string") fieldErrors[field] = error.msg ?? "Invalid value"
      })
      throw new ApiError("Please correct the highlighted fields.", response.status, fieldErrors)
    }

    throw new ApiError(
      typeof payload?.detail === "string" ? payload.detail : "The request could not be completed.",
      response.status
    )
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export function apiGet<T>(path: string, params?: Record<string, QueryValue>) {
  return request<T>("GET", path, undefined, params)
}

export function apiPost<T>(path: string, body: unknown) {
  return request<T>("POST", path, body)
}

export function apiPatch<T>(path: string, body: unknown) {
  return request<T>("PATCH", path, body)
}

export function apiDelete(path: string) {
  return request<void>("DELETE", path)
}
