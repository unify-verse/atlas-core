export function parse(
  input: string,
  separator?: string,
  delimiter?: string
): Record<string, string | string[]>

export function decode(
  input: string,
  separator?: string,
  delimiter?: string
): Record<string, string | string[]>

export function stringify(params: {}, separator?: string, delimiter?: string): string

export function encode(params: {}, separator?: string, delimiter?: string): string
