export function checkLogin(input: string, expected: string): boolean {
  const a = input.trim().toLowerCase().normalize('NFC')
  const b = expected.trim().toLowerCase().normalize('NFC')
  return a === b
}
