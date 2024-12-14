//#region 
import * as readlinePromises from "node:readline/promises";
const rl = readlinePromises.createInterface({
    input: process.stdin,
    output: process.stdout
});
//#endregion
import ANSI from "./ANSI.mjs";
import KeyBoardManager from "./keyboardManager.mjs";
import "./prototypes.mjs"
import { level1 } from "./levels.mjs";
import SPLASH from "./splash.mjs"

const SETTINGS = {
    FPS: 250,
    cashDropChance: 0.95,
    MAX_ATTACK: 2,
    LOOT_MIN: 3,
    LOOT_MAX: 7,
    HP_MAX: 10,
    MOVEMENT_SPEED: 1,
    SPLASH_DURATION: 2000
};

const GRAPHICS = {
    EMPTY: " ",
    HERO: "H",
    LOOT: "$",
    WALL: "█",
    DOOR: "D",
    HEART: " ❤️ ",
    BAD_THINGS: ["B"]
};

const playerStats = { 
    hp: SETTINGS.HP_MAX, 
    cash: 0, 
    attack: 1.1 
};

const ENEMY_STATS = {
    HP_MAX: 6,
    HP_MIN: 4,
    DAMAGE: 0.7
};

const THINGS = [GRAPHICS.LOOT, GRAPHICS.EMPTY];
const NPCs = [];
const POSSIBLE_PICKUPS = [
    { name: "a Sword", attribute: "attack is changed by", damageValue: 5 },
    { name: "a Spear", attribute: "attack is changed by", damageValue: 3 },
]

const EVENT_TEXTS = {
    PLAYER_GAINED: `Player gained `,
    PLAYER_FOUND: `Player found `,
    PLAYER_DEALT: `Player dealt `,
    BASTARD_DEALS: `Bastard dealt `,
    DAMAGE_POINTS: ` points of damage`,
    BASTARD_DEATH: `, and the bastard dies...`
};

let rawLevel = level1;

let tempLevel = rawLevel.split("\n");
let level = [];
for (let i = 0; i < tempLevel.length; i++) {
    let row = tempLevel[i];
    let outputRow = row.split("");
    level.push(outputRow);
}

let pallet = {
    "█": ANSI.COLOR.LIGHT_GRAY,
    "H": ANSI.COLOR.RED,
    "$": ANSI.COLOR.YELLOW,
    "B": ANSI.COLOR.GREEN
}

let isDirty = true; 

let playerPos = {
    row: null,
    col: null,
}

let eventText = ""; 

console.clear();

console.log(SPLASH);

await new Promise(resolve => setTimeout(resolve, SETTINGS.SPLASH_DURATION));

let gl = setInterval(gameLoop, SETTINGS.FPS)

function update() {

    if (playerPos.row == null) {

        for (let row = 0; row < level.length; row++) {
            for (let col = 0; col < level[row].length; col++) {


                let value = level[row][col];
                if (value == GRAPHICS.HERO) { 
                    playerPos.row = row;
                    playerPos.col = col;

                } else if (GRAPHICS.BAD_THINGS.includes(value)) { 
                    let hp = Math.round(Math.random() * ENEMY_STATS.HP_MAX) + ENEMY_STATS.HP_MIN;
                    let attack = ENEMY_STATS.DAMAGE + Math.random();
                    let badThing = { hp, attack, row, col };
                    NPCs.push(badThing);
                }
            }
        }
    }

    let drow = 0; 
    let dcol = 0; 

    if (KeyBoardManager.isUpPressed()) {
        drow = -1;
    } else if (KeyBoardManager.isDownPressed()) {
        drow = 1;
    }
    if (KeyBoardManager.isLeftPressed()) {
        dcol = -1;
    } else if (KeyBoardManager.isRightPressed()) {
        dcol = 1;
    }

    let tRow = playerPos.row + (SETTINGS.MOVEMENT_SPEED * drow);
    let tcol = playerPos.col + (SETTINGS.MOVEMENT_SPEED * dcol);

    if (THINGS.includes(level[tRow][tcol])) { 

        let currentItem = level[tRow][tcol];
        if (currentItem == GRAPHICS.LOOT) {

            if (Math.random() < SETTINGS.cashDropChance) { 
                let loot = Math.ceil(Math.random() * (SETTINGS.LOOT_MAX - SETTINGS.LOOT_MIN) + SETTINGS.LOOT_MIN);
                playerStats.cash += loot;
                eventText = `${EVENT_TEXTS.PLAYER_GAINED} ${loot}$`; 
            } else { 
                let item = POSSIBLE_PICKUPS.random();
                playerStats.attack += item.value;
                eventText = `${EVENT_TEXTS.PLAYER_FOUND} ${item.name}, ${item.attribute} ${item.damageValue}`;
            }
        }

        level[playerPos.row][playerPos.col] = GRAPHICS.EMPTY; 
        level[tRow][tcol] = GRAPHICS.HERO; 

        playerPos.row = tRow;
        playerPos.col = tcol;

        isDirty = true;
    } else if (GRAPHICS.BAD_THINGS.includes(level[tRow][tcol])) { 
        let antagonist = null;
        for (let i = 0; i < NPCs.length; i++) {
            let b = NPCs[i];
            if (b.row = tRow && b.col == tcol) {
                antagonist = b;
            }
        }

        let attack = ((Math.random() * SETTINGS.MAX_ATTACK) * playerStats.attack).toFixed(2);
        antagonist.hp -= attack; 

        eventText = `${EVENT_TEXTS.PLAYER_DEALT} ${attack} ${EVENT_TEXTS.DAMAGE_POINTS}`; 

        if (antagonist.hp <= 0) { 
            eventText += `${EVENT_TEXTS.BASTARD_DEATH}`
            level[tRow][tcol] = GRAPHICS.EMPTY;
        } else {
            attack = ((Math.random() * SETTINGS.MAX_ATTACK) * antagonist.attack).toFixed(2);
            playerStats.hp -= attack;
            eventText += `\n${EVENT_TEXTS.BASTARD_DEALS} ${attack}`;
        }

        tRow = playerPos.row;
        tcol = playerPos.col;

        isDirty = true;
    } 
}

function draw() {

    if (isDirty == false) {
        return;
    }
    isDirty = false;

    console.log(ANSI.CLEAR_SCREEN, ANSI.CURSOR_HOME);

    let rendering = "";

    rendering += renderHUD();

    for (let row = 0; row < level.length; row++) {
        let rowRendering = "";
        for (let col = 0; col < level[row].length; col++) {
            let symbol = level[row][col];
            if (pallet[symbol] != undefined) {
                if (GRAPHICS.BAD_THINGS.includes(symbol)) {
                    rowRendering += pallet[symbol] + symbol + ANSI.COLOR_RESET;
                } else {
                    rowRendering += pallet[symbol] + symbol + ANSI.COLOR_RESET;
                }
            } else {
                rowRendering += symbol;
            }
        }
        rowRendering += "\n";
        rendering += rowRendering;
    }

    console.log(rendering);
    if (eventText != "") {
        console.log(eventText);
        eventText = "";
    }
}

function renderHUD() {
    let hpBar = `[${ANSI.COLOR.RED + pad(Math.round(playerStats.hp), GRAPHICS.HEART) + ANSI.COLOR_RESET}${ANSI.COLOR.BLUE + pad(SETTINGS.HP_MAX - playerStats.hp, GRAPHICS.HEART) + ANSI.COLOR_RESET} ]`
    let cash = `$:${playerStats.cash}`;
    return `${hpBar} ${cash} \n`;
}

function pad(len, text) {
    let output = "";
    for (let i = 0; i < len; i++) {
        output += text;
    }
    return output;
}


function gameLoop() {
    update();
    draw();
}