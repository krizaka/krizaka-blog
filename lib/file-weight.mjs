/* The weight of a file as the captions print it, in MB: one decimal from 0.1 MB, two below it, so a 30 KB clip reads « 0.03 MB »
   and never « 0.0 MB » (krizaka-internal#3905). */
export function megabytes(bytes) {
  const mb = bytes / 1e6;
  return mb.toFixed(mb < 0.1 ? 2 : 1);
}
