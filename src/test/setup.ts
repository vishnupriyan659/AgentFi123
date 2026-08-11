import "@testing-library/jest-dom";
import { Buffer as NpmBuffer } from "buffer";

// Controlled polyfill for Buffer in JSDOM
if (typeof globalThis.Buffer === "undefined") {
  globalThis.Buffer = NpmBuffer;
}

// Polyfill Uint8Array[Symbol.hasInstance] safely without recursion
if (typeof Symbol !== "undefined" && Symbol.hasInstance) {
  try {
    Object.defineProperty(Uint8Array, Symbol.hasInstance, {
      value: function (instance: any) {
        if (!instance || typeof instance !== "object") return false;
        const tag = Object.prototype.toString.call(instance);
        return (
          tag === "[object Uint8Array]" ||
          tag === "[object Buffer]" ||
          ArrayBuffer.isView(instance) ||
          (instance.constructor && (instance.constructor.name === "Buffer" || instance.constructor.name === "Uint8Array"))
        );
      },
      configurable: true,
    });
  } catch (e) {
    // Ignore if not configurable
  }
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
