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

const Canvas = (function() {
	const TAU = Math.PI * 2;

	const randomRotations: number[] = [0, 0, 0];
	for(let i = 3; i <= 10; i++) {
		randomRotations[i] = TAU * Math.random();
	}

	return {
		drawCircle, drawRegularPolygon, drawText
	};

	// From http://www.html5canvastutorials.com/tutorials/html5-canvas-circles/
	function drawCircle(context: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number, color: string, fill: boolean) {
		context.beginPath();
		context.arc(centerX, centerY, radius, 0, TAU, false);
		if(fill) {
			context.fillStyle = color;
			context.fill();
		}
		context.lineWidth = 5;
		context.strokeStyle = color;
		context.stroke();
		context.closePath();
	}

	// From http://www.arungudelli.com/html5/html5-canvas-polygon/
	function drawRegularPolygon(context: CanvasRenderingContext2D, x: number, y: number, radius: number, sides: number, color: string) {
		if(sides < 3) { return; }
		context.fillStyle = color;
		context.strokeStyle = color;
		context.save();
		context.beginPath();
		const a = TAU / sides;
		context.translate(x, y);
		context.rotate(randomRotations[sides]);
		context.moveTo(radius, 0);
		for(let i = 1; i < sides; i++) {
			const theta = a * i;
			context.lineTo(radius * Math.cos(theta), radius * Math.sin(theta));
		}
		context.closePath();
		context.fill();
		context.restore();
	}

	function drawText(context: CanvasRenderingContext2D, turn: number, radius: number, x: number, y: number) {
		// Player 1 gets bigger font
		context.font = (turn === 1 ? 2 : 1) * radius + "px sans-serif";
		context.fillStyle = "black";
		context.textAlign = "center";
		context.textBaseline = "middle";
		context.fillText("" + turn, x, y);
	}
})();

const Color = (function() {
	let lastHue = Math.random();
	const GOLDEN_RATIO_CONJUGATE = 0.618033988749895;

	return {
		nextColor, hsvToRgb, toHex
	};

	// Based on http://martin.ankerl.com/2009/12/09/how-to-create-random-colors-programmatically/
	function nextColor() {
		const h = (lastHue + GOLDEN_RATIO_CONJUGATE) % 1;
		lastHue = h;
		return toHex(hsvToRgb(h, 0.5, 0.95));
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
	function hsvToRgb(h: number, s: number, v: number) {
		// Make sure our arguments stay in-range
		h = Math.max(0, Math.min(1, h));
		s = Math.max(0, Math.min(1, s));
		v = Math.max(0, Math.min(1, v));

		// Achromatic (grey)
		if(s === 0) {
			return [Math.round(v * 255), Math.round(v * 255), Math.round(v * 255)];
		}

		h *= 6; // sector 0 to 5
		const i = Math.floor(h);
		const f = h - i; // factorial part of h
		const p = v * (1 - s);
		const q = v * (1 - s * f);
		const t = v * (1 - s * (1 - f));

		// Assign rgb
		let r: number;
		let g: number;
		let b: number;
		switch(i) {
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

			default: // case 5:
				r = v;
				g = p;
				b = q;
		}

		return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
	}

	/** Convert RGB # array to hex string */
	function toHex(rgb: number[]) {
		// Add 0 then slice string to force 2 digits for all numbers
		return "#" + rgb.map(n => ("0" + Math.round(n).toString(16)).slice(-2)).join("");
	}
})();

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