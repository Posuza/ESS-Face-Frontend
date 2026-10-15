import * as ort from "onnxruntime-web/wasm";
import ortWasmUrl from "onnxruntime-web/ort-wasm-simd-threaded.wasm?url";

ort.env.wasm.numThreads = 1;
ort.env.wasm.wasmPaths = {
  wasm: ortWasmUrl,
};

export { ort };
