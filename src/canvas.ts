
const TAU = Math.PI * 2;

export function drawCircle(context: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number, color: string, fill: boolean) {
	// From http://www.html5canvastutorials.com/tutorials/html5-canvas-circles/
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

const randomRotations: number[] = [0, 0, 0];
for(let i = 3; i <= 10; i++) {
	randomRotations[i] = TAU * Math.random();
}

// From http://www.arungudelli.com/html5/html5-canvas-polygon/
export function drawRegularPolygon(context: CanvasRenderingContext2D, x: number, y: number, radius: number, sides: number, color: string) {
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

export function drawText(context: CanvasRenderingContext2D, turn: number, radius: number, x: number, y: number) {
	// Player 1 gets bigger font
	context.font = (turn === 1 ? 2 : 1) * radius + "px sans-serif";
	context.fillStyle = "black";
	context.textAlign = "center";
	context.textBaseline = "middle";
	context.fillText("" + turn, x, y);
}