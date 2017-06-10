"use strict";
const Canvas = (function () {
    const TAU = Math.PI * 2;
    const randomRotations = [0, 0, 0];
    for (let i = 3; i <= 10; i++) {
        randomRotations[i] = TAU * Math.random();
    }
    return {
        drawCircle, drawRegularPolygon, drawText
    };
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
    function drawText(context, turn, radius, x, y) {
        context.font = (turn === 1 ? 2 : 1) * radius + "px sans-serif";
        context.fillStyle = "black";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText("" + turn, x, y);
    }
})();
const Color = (function () {
    let lastHue = Math.random();
    const GOLDEN_RATIO_CONJUGATE = 0.618033988749895;
    return {
        nextColor, hsvToRgb, toHex
    };
    function nextColor() {
        const h = (lastHue + GOLDEN_RATIO_CONJUGATE) % 1;
        lastHue = h;
        return toHex(hsvToRgb(h, 0.5, 0.95));
    }
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
    function toHex(rgb) {
        return "#" + rgb.map(n => ("0" + Math.round(n).toString(16)).slice(-2)).join("");
    }
})();
const _touchPoints = {};
let COMPLETE = false;
const TOUCH_WAIT_TIME = 2000;
let VIBRATED = false;
const intro = document.getElementById("intro");
const canvas = document.getElementById("canvas");
canvas.width = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
canvas.height = Math.max(document.documentElement.clientHeight, window.innerHeight || 0) - 6;
const context = canvas.getContext("2d");
let CM_IN_PX = 0;
function distance(x1, y1, x2, y2) {
    const x = x1 - x2;
    const y = y1 - y2;
    return Math.sqrt(x * x + y * y);
}
function shuffle(array) {
    let currentIndex = array.length;
    while (0 !== currentIndex) {
        const randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        const temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }
    return array;
}
function clearExpiredTouchInfos() {
    const now = Date.now();
    Object.keys(_touchPoints).forEach(id => {
        const touch = _touchPoints[id];
        if (!touch.active && touch.expirationTime < now) {
            document.body.removeChild(touch.div);
            delete _touchPoints[id];
        }
    });
}
function getTouchAge(touch) {
    const now = Date.now();
    if (!touch.active) {
        return Math.min(TOUCH_WAIT_TIME, Math.max(0, touch.expirationTime - now));
    }
    else {
        return Math.min(TOUCH_WAIT_TIME, now - touch.touchStartTime);
    }
}
function getSecondOldestTouchAge() {
    const ids = Object.keys(_touchPoints);
    if (ids.length < 2) {
        return 0;
    }
    return ids.map(tid => getTouchAge(_touchPoints[tid])).sort()[ids.length - 2];
}
function havePlayersWaitedLongEnough(players) {
    return (Date.now() - Math.max(...players.map(id => _touchPoints[id].touchStartTime))) > TOUCH_WAIT_TIME;
}
function checkComplete() {
    if (!COMPLETE) {
        clearExpiredTouchInfos();
        const ids = Object.keys(_touchPoints);
        const activeIDs = ids.filter(id => _touchPoints[id].active);
        if (ids.length && ids.length === activeIDs.length && havePlayersWaitedLongEnough(ids)) {
            COMPLETE = true;
            shuffle(ids).forEach((p, i) => { _touchPoints[p].turnOrder = i + 1; });
        }
    }
}
document.body.addEventListener("touchmove", function (event) {
    event.preventDefault();
    if (!COMPLETE) {
        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            const id = touch.identifier;
            _touchPoints[id].x = touch.pageX;
            _touchPoints[id].y = touch.pageY;
        }
    }
}, false);
document.body.addEventListener("touchstart", function (event) {
    if (!VIBRATED) {
        if (navigator.vibrate) {
            navigator.vibrate(200);
        }
        VIBRATED = true;
    }
    if (!COMPLETE) {
        event.preventDefault();
        clearExpiredTouchInfos();
        const now = Date.now();
        for (let i = 0; i < event.changedTouches.length; i++) {
            const changedTouch = event.changedTouches[i];
            const id = changedTouch.identifier;
            const x = changedTouch.pageX;
            const y = changedTouch.pageY;
            let newTouch;
            const ids = Object.keys(_touchPoints).filter(tid => !_touchPoints[tid].active);
            for (let j = 0; j < ids.length; j++) {
                const touch = _touchPoints[ids[j]];
                if (distance(x, y, touch.x, touch.y) < MAX_TOUCH_RECOVERY_DISTANCE) {
                    newTouch = touch;
                    newTouch.touchStartTime = now - getTouchAge(touch);
                    delete _touchPoints[ids[j]];
                    break;
                }
            }
            if (!newTouch) {
                newTouch = {
                    color: Color.nextColor(),
                    touchStartTime: now,
                    x: 0, y: 0
                };
            }
            newTouch.x = x;
            newTouch.y = y;
            newTouch.active = true;
            newTouch.expirationTime = undefined;
            _touchPoints[id] = newTouch;
        }
    }
}, false);
document.body.addEventListener("touchend", function (event) {
    if (!COMPLETE) {
        event.preventDefault();
        const now = Date.now();
        for (let i = 0; i < event.changedTouches.length; i++) {
            const id = event.changedTouches[i].identifier;
            const touch = _touchPoints[id];
            const chargeTime = getTouchAge(touch);
            touch.active = false;
            touch.expirationTime = now + chargeTime;
            delete _touchPoints[id];
            _touchPoints[id + "-expired-" + now] = touch;
        }
    }
}, false);
let MAX_TOUCH_RECOVERY_DISTANCE = 0;
document.body.onload = function () {
    const ruler = document.getElementById("ruler");
    CM_IN_PX = parseFloat(document.defaultView.getComputedStyle(ruler).width.slice(0, -2));
    ruler.style.display = "none";
    MAX_TOUCH_RECOVERY_DISTANCE = 2 * CM_IN_PX;
};
function drawFinalTurnOrders() {
    Object.keys(_touchPoints).forEach(id => {
        const touch = _touchPoints[id];
        document.body.removeChild(touch.div);
        const turn = touch.turnOrder;
        const color = touch.color;
        if (turn === 1) {
            Canvas.drawCircle(context, touch.x, touch.y, 1.5 * CM_IN_PX, color, true);
        }
        else if (turn === 2) {
            Canvas.drawCircle(context, touch.x, touch.y, 0.6 * CM_IN_PX, color, true);
            Canvas.drawCircle(context, touch.x, touch.y, CM_IN_PX, color, false);
        }
        else {
            Canvas.drawRegularPolygon(context, touch.x, touch.y, CM_IN_PX, turn, color);
        }
        Canvas.drawText(context, turn, CM_IN_PX, touch.x, touch.y);
    });
}
function drawFinalScenery() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    document.getElementById("about").style.display = "inherit";
    document.body.style.background = "white";
    canvas.style.border = "white";
}
function drawPendingPlayer(touch) {
    if (touch.div == null) {
        const d = document.createElement("div");
        d.className = "circle";
        d.style.background = touch.color;
        d.style.position = "absolute";
        document.body.appendChild(d);
        touch.div = d;
    }
    const radius = getTouchAge(touch) / TOUCH_WAIT_TIME * CM_IN_PX;
    touch.div.style.width = 2 * radius + "px";
    touch.div.style.height = 2 * radius + "px";
    touch.div.style.top = touch.y - radius + "px";
    touch.div.style.left = touch.x - radius + "px";
}
function renderScenery() {
    const TEXT_FADE_TIME = 750;
    const maxTouchAge = getSecondOldestTouchAge();
    if (maxTouchAge === 0) {
        intro.style.display = "";
        intro.style.color = "white";
        document.body.style.background = "black";
    }
    else {
        if (maxTouchAge < TEXT_FADE_TIME) {
            const brightness = 255 - Math.round(1.0 * maxTouchAge / TEXT_FADE_TIME * 255);
            intro.style.display = "";
            intro.style.color = Color.toHex([brightness, brightness, brightness]);
        }
        else {
            intro.style.display = "none";
            intro.style.color = "black";
        }
        const progress = Math.max(0.0, 1.0 * (maxTouchAge - TEXT_FADE_TIME) / TOUCH_WAIT_TIME);
        document.body.style.background = Color.toHex(Color.hsvToRgb(0.3, 1, Math.pow(progress, 1.5) / 2));
    }
}
(function loop() {
    checkComplete();
    if (COMPLETE) {
        drawFinalScenery();
        drawFinalTurnOrders();
    }
    else {
        window.requestAnimationFrame(loop);
        renderScenery();
        Object.keys(_touchPoints).map(id => _touchPoints[id]).forEach(drawPendingPlayer);
    }
})();
