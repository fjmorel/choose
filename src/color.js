(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    let lastHue = Math.random();
    const GOLDEN_RATIO_CONJUGATE = 0.618033988749895;
    function nextColor() {
        const h = (lastHue + GOLDEN_RATIO_CONJUGATE) % 1;
        lastHue = h;
        return toHex(hsvToRgb(h, 0.5, 0.95));
    }
    exports.nextColor = nextColor;
    function hsvToRgb(h, s, v) {
        h = Math.max(0, Math.min(1, h));
        s = Math.max(0, Math.min(1, s));
        v = Math.max(0, Math.min(1, v));
        if (s === 0) {
            return [Math.round(v * 255), Math.round(v * 255), Math.round(v * 255)];
        }
        h *= 6;
        const i = Math.floor(h);
        const f = h - i;
        const p = v * (1 - s);
        const q = v * (1 - s * f);
        const t = v * (1 - s * (1 - f));
        let r;
        let g;
        let b;
        switch (i) {
            case 0:
                r = v;
                g = t;
                b = p;
                break;
            case 1:
                r = q;
                g = v;
                b = p;
                break;
            case 2:
                r = p;
                g = v;
                b = t;
                break;
            case 3:
                r = p;
                g = q;
                b = v;
                break;
            case 4:
                r = t;
                g = p;
                b = v;
                break;
            default:
                r = v;
                g = p;
                b = q;
        }
        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }
    exports.hsvToRgb = hsvToRgb;
    function toHex(rgb) {
        return "#" + rgb.map(n => ("0" + Math.round(n).toString(16)).slice(-2)).join("");
    }
    exports.toHex = toHex;
});
