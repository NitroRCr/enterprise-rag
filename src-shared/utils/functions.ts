export function sizeBytes(size: string) {
  const unit = (size.at(-1) ?? '').toUpperCase()
  const value = +size.slice(0, -1)
  if (unit === 'B') return value
  if (unit === 'K') return value * 1024
  if (unit === 'M') return value * (1024 ** 2)
  if (unit === 'G') return value * (1024 ** 3)
  if (unit === 'T') return value * (1024 ** 4)
  return NaN
}

export function formatBytes(bytes: number) {
  let b = bytes
  for (const unit of ['B', 'KB', 'MB', 'GB', 'TB']) {
    if (b < 1024) return `${b.toFixed(b < 10 && unit !== 'B' ? 1 : 0)} ${unit}`
    b /= 1024
  }
  return `${b.toFixed(1)} PB`
}

export function getExt(filename: string) {
  return filename.includes('.') ? (filename.split('.').pop() ?? '').toLowerCase() : ''
}

export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]) {
  return Object.fromEntries(keys.map(key => [key, obj[key]])) as Pick<T, K>
}
