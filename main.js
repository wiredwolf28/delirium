function lfsr(seed, taps=0xB400, bits=16)
{
	if(Array.isArray(taps))
	{
		// nothing to do
	}
	else if(typeof taps === "number")
	{
		let newTaps = [];
		let tapNumber = 1;
		while(taps)
		{
			if(taps & 0x1)
			{
				newTaps.push(bits - tapNumber);
			}
			tapNumber += 1;
			taps >>>= 1;
		}
		taps = newTaps;
	}
	else
	{
		throw new Error(`bad taps: ${taps}`);
	}
	let mostSignificantBit = taps.map(tap => seed >>> tap).reduce((a, b) => a ^ b) & 1;
	let newValue = (mostSignificantBit << (bits - 1)) | (seed >>> 1);
	return newValue;
}
let SEED_BITS = 24;
let SEED_TAPS = 0xE10000;
let SEED = 1 + Math.floor(Math.random()*(Math.pow(2, SEED_BITS) - 1));

function rand()
{
	SEED = lfsr(SEED, SEED_TAPS, SEED_BITS);
	return SEED/Math.pow(2, SEED_BITS);
}

let WIDTH = 13;
let HEIGHT = 13;
let BOSS = String.fromCodePoint(0x1F480);
let START = String.fromCodePoint(0x1FA9C);

function at(x, y)
{
	return document.querySelector(`*[data-x="${x}"][data-y="${y}"]`);
}
function getAdjacentRooms(x, y)
{
	if(x instanceof HTMLElement)
	{
		y = +x.dataset["y"];
		x = +x.dataset["x"];
	}
	let neighbors = [
		at(x, y - 1),
		at(x, y + 1),
		at(x - 1, y),
		at(x + 1, y),
	];
	neighbors = neighbors.filter(neighbor => {
		if(!neighbor) return false;
		if(neighbor.classList.contains("map")) return true;
		return false;
	});
	return neighbors;
}
function generateMap()
{
	let grid = document.createElement("table");
	for(let y = 0; y < HEIGHT; y++)
	{
		let row = document.createElement("tr");
		for(let x = 0; x < WIDTH; x++)
		{
			let cell = document.createElement("td");
			cell.textContent = " ";
			cell.dataset["x"] = x;
			cell.dataset["y"] = y;
			cell.classList.add(`x-${x}`);
			cell.classList.add(`y-${y}`);
			row.appendChild(cell);
		}
		grid.appendChild(row);
	}
	return grid;
}
function populateMap(x, y, chance)
{
	let thisRoom = at(x, y);
	if(thisRoom.classList.contains("ignored")) return;
	thisRoom.classList.add("map");
	for(let dy of [-1, +1])
	{
		let dx = 0;
		if((y + dy) < 0) continue;
		if((y + dy) >= HEIGHT) continue;
		if(rand() < chance)
		{
			populateMap(x + dx, y + dy, chance - 1/HEIGHT);
		}
		else
		{
			at(x + dx, y + dy).classList.add("ignored");
		}
	}
	for(let dx of [-1, +1])
	{
		let dy = 0;
		if((x + dx) < 0) continue;
		if((x + dx) >= WIDTH) continue;
		if(rand() < chance)
		{
			populateMap(x + dx, y + dy, chance - 1/WIDTH);
		}
		else
		{
			at(x + dx, y + dy).classList.add("ignored");
		}
	}
}
function addBosses(x, y)
{
	let thisRoom = at(x, y);
	thisRoom.classList.add("seen");
	for(let dy of [-1, +1])
	{
		let dx = 0;
		if((y + dy) < 0) continue;
		if((y + dy) >= HEIGHT) continue;
		let room = at(x + dx, y + dy);
		if(!room.classList.contains("seen") && room.classList.contains("map")) addBosses(x + dx, y + dy);
	}
	for(let dx of [-1, +1])
	{
		let dy = 0;
		if((x + dx) < 0) continue;
		if((x + dx) >= WIDTH) continue;
		let room = at(x + dx, y + dy);
		if(!room.classList.contains("seen") && room.classList.contains("map")) addBosses(x + dx, y + dy);
	}
	let neighbors = [
		at(x, y - 1),
		at(x, y + 1),
		at(x - 1, y),
		at(x + 1, y),
	];
	neighbors = neighbors.filter(neighbor => {
		if(!neighbor) return false;
		if(neighbor.classList.contains("map")) return true;
		return false;
	});
	if(neighbors.length <= 1)
	{
		if(rand() < 0.75 && !thisRoom.classList.contains("start"))
		{
			thisRoom.classList.add("boss");
			thisRoom.textContent = BOSS;
		}
	}
}
//function getShiftAmounts()
//{
//	let rooms = Array.from(document.querySelectorAll(".map"));
//	let coords = rooms.map(room => [+room.dataset["x"], +room.dataset["y"]]);
//	let coordMin = coords.reduce((a, b) => [
//		a[0] < b[0] ? a[0] : b[0],
//		a[1] < b[1] ? a[1] : b[1]
//	]);
//	let coordMax = coords.reduce((a, b) => [
//		a[0] > b[0] ? a[0] : b[0],
//		a[1] > b[1] ? a[1] : b[1]
//	]);
//	let dx = (
//		(coordMin[0] == 0 && coordMax[0] < WIDTH - 2)
//		? +2
//		: (coordMax[0] == WIDTH - 1 && coordMin[0] > 0)
//		? -1
//		: 0
//	);
//	let dy = (
//		(coordMin[1] == 0 && coordMax[1] < HEIGHT - 2)
//		? +2
//		: (coordMax[1] == HEIGHT - 1 && coordMin[1] > 0)
//		? -1
//		: 0
//	);
//	//console.log(dx, dy, coordMin, coordMax);
//	return [dx, dy];
//}
function shiftMap(dx, dy)
{
	let rooms = Array.from(document.querySelectorAll(".map"));
	let newMap = generateMap();
	for(let oldRoom of rooms)
	{
		let x = +oldRoom.dataset.x;
		let y = +oldRoom.dataset.y;
		let query = `*[data-x="${x + dx}"][data-y="${y + dy}"]`;
		let newRoom = newMap.querySelector(query);
		newRoom.className = oldRoom.className;
		newRoom.textContent = oldRoom.textContent;
	}
	let oldTable = document.body.querySelector("table");
	oldTable.parentElement.insertBefore(newMap, oldTable);
	oldTable.parentElement.removeChild(oldTable);
}
function checkDelirium(x, y)
{
	if(x instanceof HTMLElement)
	{
		y = +x.dataset["y"];
		x = +x.dataset["x"];
	}
	let neighbors = getAdjacentRooms(x, y);
	let direction = [
		x - +neighbors[0].dataset["x"],
		y - +neighbors[0].dataset["y"]
	];

	// NOTE(tori): here be dragons

	let checkSets = null;

	if(direction[1] == -1)
	{
		checkSets = [
			[
				[-1, -1], [ 0, -1],
				[-1,  0], [ 0,  0],
			],
			[
				[ 0, -1], [+1, -1],
				[ 0,  0], [+1,  0]
			]
		];
	}
	else if(direction[1] == +1)
	{
		checkSets = [
			[
				[-1,  0], [ 0,  0],
				[-1, +1], [ 0, +1],
			],
			[
				[ 0,  0], [+1,  0],
				[ 0, +1], [+1, +1]
			]
		]
	}
	else if(direction[0] == -1)
	{
		checkSets = [
			[
				[-1, -1], [ 0, -1],
				[-1,  0], [ 0,  0],
			],
			[
				[-1,  0], [ 0,  0],
				[-1, +1], [ 0, +1]
			]
		]
	}
	else if(direction[0] == +1)
	{
		checkSets = [
			[
				[ 0, -1], [+1, -1],
				[ 0,  0], [+1,  0],
			],
			[
				[ 0,  0], [+1,  0],
				[ 0, +1], [+1, +1]
			]
		]
	}
	else
	{
		throw new Error("bad stuff");
	}

	let canBe = false;

	for(let checkSet of checkSets)
	{
		//console.log('-');
		let couldBe = true;
		let neighborCount = 0;
		for(let [dx, dy] of checkSet)
		{
			let deliriumSquare = at(x + dx, y + dy);
			if(!deliriumSquare)
			{
				couldBe = false;
				break
			}
			let adjacent = getAdjacentRooms(deliriumSquare);
			neighborCount += adjacent.length;
			//console.log(deliriumSquare, adjacent);
		}
		if(neighborCount == 3 && couldBe)
		{
			canBe = true;
			for(let [dx, dy] of checkSet)
			{
				let deliriumSquare = at(x + dx, y + dy);
				deliriumSquare.classList.add("deliriumSquare");
			}
		}
	}

	return canBe;
}
function markDeliriumLocations()
{
	let bossRooms = document.querySelectorAll(".boss");
	for(let bossRoom of bossRooms)
	{
		if(checkDelirium(bossRoom))
		{
			bossRoom.classList.add("delirium");
		}
	}
}
let gameOver = false;
function main(seeded)
{
	if(seeded)
	{
		SEED = +prompt("Seed:") || 1;
		//console.log(SEED)
	}
	document.querySelector("#seed").textContent = SEED;
	WIDTH = +document.querySelector("#widthInput").value;
	HEIGHT = +document.querySelector("#heightInput").value;
	document.querySelector("#width").textContent = WIDTH;
	document.querySelector("#height").textContent = HEIGHT;
	document.querySelector("#wRadius").textContent = Math.floor(WIDTH/2);
	document.querySelector("#hRadius").textContent = Math.floor(HEIGHT/2);
	do
	{
		do
		{
			document.querySelector("#main").textContent = "";
			let grid = generateMap();
			document.querySelector("#main").appendChild(grid);
			populateMap(Math.floor(WIDTH/2), Math.floor(HEIGHT/2), 1.2);
			let startRoom = at(Math.floor(WIDTH/2), Math.floor(HEIGHT/2))
			startRoom.textContent = START;
			startRoom.classList.add("start");
			addBosses(Math.floor(WIDTH/2), Math.floor(HEIGHT/2));
			Array.from(document.querySelectorAll(".seen")).forEach(room => {
				room.classList.remove("seen");
			});
		}
		while(document.querySelectorAll(".boss").length < 4 || document.querySelectorAll(".boss").length == document.querySelectorAll(".delirium").length);

		//let [dx, dy] = getShiftAmounts();
		//shiftMap(dx, dy);
		markDeliriumLocations();
	}
	while(!document.querySelector(".delirium"));

	gameOver = false;
	document.querySelectorAll(".boss").forEach(bossRoom => {
		bossRoom.addEventListener("click", evt => {
			if(gameOver) return;
			if(evt.target.classList.contains("delirium"))
			{
				gameOver = true;
				document.querySelector("table").className = "gameOver";
				setTimeout(() => alert("You lose!"), 2);
				return;
			}
			evt.target.classList.add("revealed");
			let unrevealedBosses = document.querySelectorAll(".boss:not(.delirium):not(.revealed)");
			if(unrevealedBosses.length === 0)
			{
				gameOver = true;
				document.querySelector("table").className = "gameOver";
				setTimeout(() => alert("You win!"), 2);
			}
		});
	});
}

window.addEventListener("load", () => {
	main(false);
	document.querySelector("#reset").addEventListener("click", evt => main(false));
	document.querySelector("#resetSeeded").addEventListener("click", evt => main(true));
	document.querySelector("#noOptions").addEventListener("click", () => {
		if(gameOver) return;
		gameOver = true;
		let unrevealedBosses = document.querySelectorAll(".boss:not(.delirium):not(.revealed)");
		if(unrevealedBosses.length === 0)
		{
			document.querySelector("table").className = "gameOver";
			setTimeout(() => alert("You win!"), 2);
		}
		else
		{
			document.querySelector("table").className = "gameOver";
			setTimeout(() => alert("You lose!"), 2);
		}
	});
});
