"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.callAPI = callAPI;
async function callAPI(precode) {
    const res = await fetch(`http://127.0.0.1:8000/${precode}`);
    const data = await res.json();
    return data;
}
//# sourceMappingURL=index.js.map