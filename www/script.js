"use strict";
/** Active touches and recent let go points */
let _touchPoints = {};
let complete = false;
const TAU = Math.PI * 2;
const TOUCH_WAIT_TIME = 2000;
const TEXT_FADE_TIME = 750;
let VIBRATED = false;
// Based on http://martin.ankerl.com/2009/12/09/how-to-create-random-colors-programmatically/
let lastHue = Math.random();
const GOLDEN_RATIO_CONJUGATE = 0.618033988749895;
function nextColor() {
    const h = (lastHue + GOLDEN_RATIO_CONJUGATE) % 1;
    lastHue = h;
    return toHexColor(hsvToRgb(h, 0.5, 0.95));
}
// From http://snipplr.com/view.php?codeview&id=14590
/**
 * HSV to RGB color conversion
 *
 * H runs from 0 to 360 degrees
 * S and V run from 0 to 1
 *
 * Ported from the excellent java algorithm by Eugene Vishnevsky at:
 * http://www.cs.rit.edu/~ncs/color/t_convert.html
 */
function hsvToRgb(h, s, v) {
    let r;
    let g;
    let b;
    let i;
    let f;
    let p;
    let q;
    let t;
    // Make sure our arguments stay in-range
    h = Math.max(0, Math.min(1, h));
    s = Math.max(0, Math.min(1, s));
    v = Math.max(0, Math.min(1, v));
    if (s === 0) {
        // Achromatic (grey)
        r = g = b = v;
        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }
    h *= 6; // sector 0 to 5
    i = Math.floor(h);
    f = h - i; // factorial part of h
    p = v * (1 - s);
    q = v * (1 - s * f);
    t = v * (1 - s * (1 - f));
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
/** Convert RGB # array to hex string */
function toHexColor(rgb) {
    let res = "#";
    for (let i = 0; i < 3; i++) {
        res += ("0" + Math.round(rgb[i]).toString(16)).slice(-2);
    }
    return res;
}
/** Distance between points 1 and 2 with x and y coordinates */
function distance(x1, y1, x2, y2) {
    const x = x1 - x2;
    const y = y1 - y2;
    return Math.sqrt(x * x + y * y);
}
// From http://stackoverflow.com/a/2450976
function shuffle(array) {
    let currentIndex = array.length;
    // While there remain elements to shuffle...
    while (0 !== currentIndex) {
        // Pick a remaining element...
        const randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;
        // And swap it with the current element.
        const temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }
    return array;
}
/** Remove any inactive and expired touches */
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
function getNewestActiveTouchTime(players) {
    return Date.now() - Math.max(...players.map(id => _touchPoints[id].touchStartTime));
}
/** Complete if all touches are active and old enough */
function checkComplete() {
    if (!complete) {
        clearExpiredTouchInfos();
        const players = Object.keys(_touchPoints);
        const activePlayers = players.filter(id => _touchPoints[id].active);
        if (players.length > 1 && activePlayers.length === players.length && getNewestActiveTouchTime(activePlayers) > TOUCH_WAIT_TIME) {
            complete = true;
            // Shuffle touches and assign player order
            shuffle(players);
            players.forEach((p, i) => { _touchPoints[p].turnOrder = i + 1; });
        }
    }
}
// Move touch with finger
document.body.addEventListener("touchmove", function (event) {
    // prevent scrolling (from http://www.html5rocks.com/en/mobile/touch/ )
    event.preventDefault();
    if (!complete) {
        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            const id = touch.identifier;
            _touchPoints[id].x = touch.pageX;
            _touchPoints[id].y = touch.pageY;
        }
    }
}, false);
// Add touch to screen
document.body.addEventListener("touchstart", function (event) {
    // Vibrate on first touch to trigger permission immediately
    if (!VIBRATED) {
        if (navigator.vibrate) {
            navigator.vibrate(200);
        }
        VIBRATED = true;
    }
    if (!complete) {
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
                    color: nextColor(),
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
// Mark touch as inactive and start expiration timer on touch end
document.body.addEventListener("touchend", function (event) {
    if (!complete) {
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
// From http://www.paulirish.com/2011/requestanimationframe-for-smart-animating/
// shim layer with setTimeout fallback
window.requestAnimFrame = (function () {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        function (callback) {
            window.setTimeout(callback, 1000 / 60);
        };
})();
let canvas = document.getElementById("canvas");
// From http://stackoverflow.com/a/8876069
canvas.width = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
canvas.height = Math.max(document.documentElement.clientHeight, window.innerHeight || 0) - 6;
let context = canvas.getContext("2d");
let RADIUS = 0;
let MAX_TOUCH_RECOVERY_DISTANCE = 0;
let ruler = document.getElementById("ruler");
document.body.onload = function () {
    const CM_IN_PX = parseFloat(document.defaultView.getComputedStyle(ruler).width.slice(0, -2));
    ruler.style.display = "none";
    RADIUS = 1 * CM_IN_PX;
    MAX_TOUCH_RECOVERY_DISTANCE = 2 * RADIUS;
};
function drawCircle(centerX, centerY, radius, color, fill) {
    // From http://www.html5canvastutorials.com/tutorials/html5-canvas-circles/
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
let randomRotations = [0, 0, 0];
for (let i = 3; i <= 10; i++) {
    randomRotations[i] = TAU * Math.random();
}
// From http://www.arungudelli.com/html5/html5-canvas-polygon/
function drawRegularPolygon(x, y, radius, sides) {
    if (sides < 3) {
        return;
    }
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
/** Render final shapes showing player order */
function drawFinalTurnOrders() {
    // Draw each player.
    Object.keys(_touchPoints).forEach(id => {
        const touch = _touchPoints[id];
        document.body.removeChild(touch.div);
        const turn = touch.turnOrder;
        const color = touch.color;
        // 1 and 2 get circles. 3+ get polygon with 3+ sides
        if (turn === 1) {
            drawCircle(touch.x, touch.y, 1.5 * RADIUS, color, true);
        }
        else if (turn === 2) {
            drawCircle(touch.x, touch.y, 0.6 * RADIUS, color, true);
            drawCircle(touch.x, touch.y, RADIUS, color, false);
        }
        else {
            context.fillStyle = color;
            context.strokeStyle = color;
            drawRegularPolygon(touch.x, touch.y, RADIUS, turn);
        }
        // Player 1 gets bigger font
        context.font = (turn === 1 ? 2 : 1) * RADIUS + "px sans-serif";
        context.fillStyle = "black";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText("" + turn, touch.x, touch.y);
    });
}
/** Clear everything, set screen to white */
function drawFinalScenery() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    document.getElementById("about").style.display = "inherit";
    document.body.style.background = "white";
    canvas.style.border = "white";
}
/** Render growing circles for each player */
function drawPendingPlayers() {
    Object.keys(_touchPoints).forEach(id => {
        const touch = _touchPoints[id];
        if (touch.div == null) {
            const d = document.createElement("div");
            d.className = "circle";
            d.style.background = touch.color;
            d.style.position = "absolute";
            document.body.appendChild(d);
            touch.div = d;
        }
        const radius = getTouchAge(touch) / TOUCH_WAIT_TIME * RADIUS;
        touch.div.style.width = 2 * radius + "px";
        touch.div.style.height = 2 * radius + "px";
        touch.div.style.top = touch.y - radius + "px";
        touch.div.style.left = touch.x - radius + "px";
    });
}
/** Show text if no touches. Otherwise fade and change background. */
function renderScenery() {
    const intro = document.getElementById("intro");
    const maxTouchAge = getSecondOldestTouchAge();
    if (maxTouchAge === 0) {
        // Not enough touches - show intro text
        intro.style.display = "";
        intro.style.color = "white";
        document.body.style.background = "black";
    }
    else {
        // Otherwise fade intro text
        if (maxTouchAge < TEXT_FADE_TIME) {
            intro.style.display = "";
            const brightness = 255 - Math.round(1.0 * maxTouchAge / TEXT_FADE_TIME * 255.0);
            intro.style.color = toHexColor([brightness, brightness, brightness]);
        }
        else {
            intro.style.display = "none";
            intro.style.color = "black";
        }
        const progress = Math.max(0.0, 1.0 * (maxTouchAge - TEXT_FADE_TIME) / TOUCH_WAIT_TIME);
        const progressColor = toHexColor(hsvToRgb(0.3, 1, Math.pow(progress, 1.5) / 2));
        document.body.style.background = progressColor;
    }
}
// Start animation loop
(function loop() {
    checkComplete();
    if (complete) {
        drawFinalScenery();
        drawFinalTurnOrders();
    }
    else {
        renderScenery();
        drawPendingPlayers();
        window.requestAnimFrame(loop);
    }
    // todo: reset button to start loop again
})();
