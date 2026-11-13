import '@testing-library/jest-dom';
import { TextDecoder, TextEncoder } from 'node:util';
import { ReadableStream, TransformStream, WritableStream } from 'node:stream/web';

// react-router v7 is built on the WHATWG encoding and streams API. jsdom
// provides neither, and Jest's jsdom environment hides the copies Node has,
// so importing the router throws `TextEncoder is not defined` before a
// single assertion runs. The polyfills below are the Node implementations -
// the same behaviour, exposed as globals.
if (typeof globalThis.TextEncoder === 'undefined') {
  globalThis.TextEncoder = TextEncoder;
}

if (typeof globalThis.TextDecoder === 'undefined') {
  globalThis.TextDecoder = TextDecoder;
}

if (typeof globalThis.ReadableStream === 'undefined') {
  globalThis.ReadableStream = ReadableStream;
}

if (typeof globalThis.WritableStream === 'undefined') {
  globalThis.WritableStream = WritableStream;
}

if (typeof globalThis.TransformStream === 'undefined') {
  globalThis.TransformStream = TransformStream;
}
