const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

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

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }
  return "Something went wrong."
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
    throw new ApiError(
      "Cannot reach the backend. Check that it is running (a sleeping Neon database can take a few seconds to wake) and try again.",
      0
    )
  }

  if (!response.ok) {
    let payload: { detail?: string | ValidationError[] } | undefined
    try {
      payload = (await response.json()) as { detail?: string | ValidationError[] }
    } catch {
      payload = undefined
    }

    if (typeof payload?.detail === "string") {
      throw new ApiError(payload.detail, response.status)
    }

    if (Array.isArray(payload?.detail)) {
      const fieldErrors: Record<string, string> = {}
      for (const error of payload.detail) {
        const field = error.loc?.at(-1)
        if (typeof field === "string" && fieldErrors[field] === undefined) {
          fieldErrors[field] = error.msg ?? "Invalid value"
        }
      }

      const message =
        Object.keys(fieldErrors).length > 0
          ? "Please correct the highlighted fields."
          : payload.detail[0]?.msg ?? "The request could not be completed."

      throw new ApiError(message, response.status, fieldErrors)
    }

    throw new ApiError(`Request failed (${response.status}).`, response.status)
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
