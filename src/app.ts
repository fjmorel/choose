import * as Color from "./color";
import * as Canvas from "./canvas";

interface ITouchInfo {
	/** Being touched right now */
	active?: boolean;
	/** Container for touch element */
	div?: HTMLDivElement;
	/** How long to wait before removing touch if finger lifted? */
	expirationTime?: number;
	/** Time when touch was started */
	touchStartTime: number;
	/** Center x coordinate */
	x: number;
	/** Center y coordinate */
	y: number;
	/** Given position for player */
	turnOrder?: number;
	/** Touch circle color */
	color: string;
}

/** Active touches and recent let go points */
const _touchPoints: { [key: string]: ITouchInfo } = {};
/** Have turn orders been assigned? */
let COMPLETE = false;
/** How long to wait before assigning turns  */
const TOUCH_WAIT_TIME = 2000;
/** Whether we've vibrated (and asked permission) yet */
let VIBRATED = false;

/** Text telling players what to do */
const intro = document.getElementById("intro") as HTMLSpanElement;

/** Drawing board */
const canvas = document.getElementById("canvas") as HTMLCanvasElement;
// From http://stackoverflow.com/a/8876069
canvas.width = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
canvas.height = Math.max(document.documentElement.clientHeight, window.innerHeight || 0) - 6;
/** Rendering context */
const context = canvas.getContext("2d")!;
/** How big a centimeter is in pixels on this screen */
let CM_IN_PX = 0;

/** Distance between points 1 and 2 with x and y coordinates */
function distance(x1: number, y1: number, x2: number, y2: number) {
	const x = x1 - x2;
	const y = y1 - y2;
	return Math.sqrt(x * x + y * y);
}

// From http://stackoverflow.com/a/2450976
function shuffle<T>(array: T[]) {
	let currentIndex = array.length;

	// While there remain elements to shuffle...
	while(0 !== currentIndex) {

		// Pick a remaining element...
		const randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex--;

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
		if(!touch.active && touch.expirationTime! < now) {
			document.body.removeChild(touch.div!);
			delete _touchPoints[id];
		}
	});
}

/** Get how long touch has been active or left inactive */
function getTouchAge(touch: ITouchInfo) {
	const now = Date.now();
	if(!touch.active) {
		return Math.min(TOUCH_WAIT_TIME, Math.max(0, touch.expirationTime! - now));
	} else {
		return Math.min(TOUCH_WAIT_TIME, now - touch.touchStartTime);
	}
}

/** Get how long players have been touching screen (to fade intro) */
function getSecondOldestTouchAge() {
	const ids = Object.keys(_touchPoints);
	if(ids.length < 2) { return 0; }
	return ids.map(tid => getTouchAge(_touchPoints[tid])).sort()[ids.length - 2];
}

/** Newest touchstart time is older than wait time */
function havePlayersWaitedLongEnough(players: string[]) {
	return (Date.now() - Math.max(...players.map(id => _touchPoints[id].touchStartTime))) > TOUCH_WAIT_TIME;
}

/** Complete if all touches are active and old enough */
function checkComplete() {
	if(!COMPLETE) {
		clearExpiredTouchInfos();
		const ids = Object.keys(_touchPoints);
		const activeIDs = ids.filter(id => _touchPoints[id].active);
		if(ids.length && ids.length === activeIDs.length && havePlayersWaitedLongEnough(ids)) {
			COMPLETE = true;
			// Shuffle touches and assign player order
			shuffle(ids).forEach((p, i) => { _touchPoints[p].turnOrder = i + 1; });
		}
	}
}

// Move touch with finger
document.body.addEventListener("touchmove", function(event) {
	// prevent scrolling (from http://www.html5rocks.com/en/mobile/touch/ )
	event.preventDefault();
	if(!COMPLETE) {
		for(let i = 0; i < event.changedTouches.length; i++) {
			const touch = event.changedTouches[i];
			const id = touch.identifier;
			_touchPoints[id].x = touch.pageX;
			_touchPoints[id].y = touch.pageY;
		}
	}
}, false);

// Add touch to screen
document.body.addEventListener("touchstart", function(event) {
	// Vibrate on first touch to trigger permission immediately
	if(!VIBRATED) {
		if(navigator.vibrate) { navigator.vibrate(200); }
		VIBRATED = true;
	}
	if(!COMPLETE) {
		event.preventDefault();
		clearExpiredTouchInfos();

		const now = Date.now();

		for(let i = 0; i < event.changedTouches.length; i++) {
			const changedTouch = event.changedTouches[i];
			const id = changedTouch.identifier;
			const x = changedTouch.pageX;
			const y = changedTouch.pageY;

			let newTouch: ITouchInfo | undefined;
			const ids = Object.keys(_touchPoints).filter(tid => !_touchPoints[tid].active);
			for(let j = 0; j < ids.length; j++) {
				const touch = _touchPoints[ids[j]];
				if(distance(x, y, touch.x, touch.y) < MAX_TOUCH_RECOVERY_DISTANCE) {
					newTouch = touch;
					newTouch.touchStartTime = now - getTouchAge(touch);
					delete _touchPoints[ids[j]];
					break;
				}
			}
			if(!newTouch) {
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

// Mark touch as inactive and start expiration timer on touch end
document.body.addEventListener("touchend", function(event) {
	if(!COMPLETE) {
		event.preventDefault();
		const now = Date.now();

		for(let i = 0; i < event.changedTouches.length; i++) {
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

document.body.onload = function() {
	const ruler = document.getElementById("ruler") as HTMLDivElement;
	CM_IN_PX = parseFloat(document.defaultView.getComputedStyle(ruler).width!.slice(0, -2));
	ruler.style.display = "none";
	MAX_TOUCH_RECOVERY_DISTANCE = 2 * CM_IN_PX;
};

/** Render final shapes showing player order */
function drawFinalTurnOrders() {
	// Draw each player.
	Object.keys(_touchPoints).forEach(id => {
		const touch = _touchPoints[id];
		document.body.removeChild(touch.div!);
		const turn = touch.turnOrder!;
		const color = touch.color;
		// 1 and 2 get circles. 3+ get polygon with 3+ sides
		if(turn === 1) {
			Canvas.drawCircle(context, touch.x, touch.y, 1.5 * CM_IN_PX, color, true);
		} else if(turn === 2) {
			Canvas.drawCircle(context, touch.x, touch.y, 0.6 * CM_IN_PX, color, true);
			Canvas.drawCircle(context, touch.x, touch.y, CM_IN_PX, color, false);
		} else {
			Canvas.drawRegularPolygon(context, touch.x, touch.y, CM_IN_PX, turn, color);
		}
		Canvas.drawText(context, turn, CM_IN_PX, touch.x, touch.y);
	});
}

/** Clear everything, set screen to white */
function drawFinalScenery() {
	context.clearRect(0, 0, canvas.width, canvas.height);
	(document.getElementById("about") as HTMLAnchorElement).style.display = "inherit";
	document.body.style.background = "white";
	canvas.style.border = "white";
}

/** Render growing circle for each player */
function drawPendingPlayer(touch: ITouchInfo) {
	if(touch.div == null) {
		const d = document.createElement("div") as HTMLDivElement;
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

/** Show text if no touches. Otherwise fade and change background. */
function renderScenery() {
	const TEXT_FADE_TIME = 750;
	const maxTouchAge = getSecondOldestTouchAge();
	if(maxTouchAge === 0) {
		// Not enough touches - show intro text
		intro.style.display = "";
		intro.style.color = "white";
		document.body.style.background = "black";
	} else {
		// Otherwise fade intro text
		if(maxTouchAge < TEXT_FADE_TIME) {
			const brightness = 255 - Math.round(1.0 * maxTouchAge / TEXT_FADE_TIME * 255);
			intro.style.display = "";
			intro.style.color = Color.toHex([brightness, brightness, brightness]);
		} else {
			intro.style.display = "none";
			intro.style.color = "black";
		}
		const progress = Math.max(0.0, 1.0 * (maxTouchAge - TEXT_FADE_TIME) / TOUCH_WAIT_TIME);
		document.body.style.background = Color.toHex(Color.hsvToRgb(0.3, 1, Math.pow(progress, 1.5) / 2));
	}
}

// Start animation loop
(function loop() {
	checkComplete();
	if(COMPLETE) {
		drawFinalScenery();
		drawFinalTurnOrders();
	} else {
		window.requestAnimationFrame(loop);
		renderScenery();
		Object.keys(_touchPoints).map(id => _touchPoints[id]).forEach(drawPendingPlayer);
	}
	// todo: reset button to start loop again
})();