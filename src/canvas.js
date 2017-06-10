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
    const TAU = Math.PI * 2;
    function drawCircle(context, centerX, centerY, radius, color, fill) {
        context.beginPath();
        context.arc(centerX, centerY, radius, 0, TAU, false);
        if (fill) {
            context.fillStyle = color;
            context.fill();
        }
        context.lineWidth = 5;
        context.strokeStyle = color;
        context.stroke();
        context.closePath();
    }
    exports.drawCircle = drawCircle;
    const randomRotations = [0, 0, 0];
    for (let i = 3; i <= 10; i++) {
        randomRotations[i] = TAU * Math.random();
    }
    function drawRegularPolygon(context, x, y, radius, sides, color) {
        if (sides < 3) {
            return;
        }
        context.fillStyle = color;
        context.strokeStyle = color;
        context.save();
        context.beginPath();
        const a = TAU / sides;
        context.translate(x, y);
        context.rotate(randomRotations[sides]);
        context.moveTo(radius, 0);
        for (let i = 1; i < sides; i++) {
            const theta = a * i;
            context.lineTo(radius * Math.cos(theta), radius * Math.sin(theta));
        }
        context.closePath();
        context.fill();
        context.restore();
    }
    exports.drawRegularPolygon = drawRegularPolygon;
    function drawText(context, turn, radius, x, y) {
        context.font = (turn === 1 ? 2 : 1) * radius + "px sans-serif";
        context.fillStyle = "black";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText("" + turn, x, y);
    }
    exports.drawText = drawText;
});
