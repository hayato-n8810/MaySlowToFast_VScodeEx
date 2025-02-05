"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.callAPI = callAPI;
async function callAPI(precode) {
    const res = await fetch(`https://mayslowtofastapi.onrender.com/${precode}`);
    const data = await res.json();
    return data;
}
//# sourceMappingURL=index.js.map