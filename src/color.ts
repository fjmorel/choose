// Based on http://martin.ankerl.com/2009/12/09/how-to-create-random-colors-programmatically/
let lastHue = Math.random();
const GOLDEN_RATIO_CONJUGATE = 0.618033988749895;
export function nextColor() {
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
export function hsvToRgb(h: number, s: number, v: number) {
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
export function toHex(rgb: number[]) {
	// Add 0 then slice string to force 2 digits for all numbers
	return "#" + rgb.map(n => ("0" + Math.round(n).toString(16)).slice(-2)).join("");
}