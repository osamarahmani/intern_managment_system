export const keepPreviousIfEqual = (previous, next) => {
  if (Object.is(previous, next)) return previous
  try {
    return JSON.stringify(previous) === JSON.stringify(next) ? previous : next
  } catch {
    return next
  }
}
