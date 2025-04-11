declare module 'bcryptjs' {
  export function genSalt(rounds?: number, callback?: (err: Error, salt: string) => void): Promise<string>;
  export function hash(s: string, salt: string | number, callback?: (err: Error, hash: string) => void): Promise<string>;
  export function compare(s: string, hash: string, callback?: (err: Error, same: boolean) => void): Promise<boolean>;
  export function getRounds(hash: string): number;
}
