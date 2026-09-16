const STRIP = /[<>]/g;

export function sanitize(input: string): string {
  return input.replace(STRIP, "").trim();
}
