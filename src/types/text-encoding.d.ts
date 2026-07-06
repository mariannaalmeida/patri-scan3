declare module 'text-encoding' {
  export class TextDecoder {
    constructor(encoding: string, options?: { fatal?: boolean });
    decode(input: ArrayBuffer | ArrayBufferView): string;
  }
  export class TextEncoder {
    constructor();
    encode(input: string): Uint8Array;
  }
}
