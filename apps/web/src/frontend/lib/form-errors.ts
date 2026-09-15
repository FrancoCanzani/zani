export function fieldErrors(
  errors: unknown[]
): Array<{ message?: string } | undefined> {
  return errors.map((error) => {
    if (typeof error === "string") {
      return { message: error }
    }
    if (
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof error.message === "string"
    ) {
      return { message: error.message }
    }
    return { message: "Invalid value" }
  })
}
