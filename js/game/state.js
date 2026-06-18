// Run state: resources, selected tool, scout progress, win/lose.
export const TOOL = { MINE: 1, BUILD: 2, SCOUT: 3, CANNON: 4 };

export class GameState {
  constructor() {
    this.stone = 20;
    this.firesalt = 4;
    this.tool = TOOL.CANNON;
    this.reveal = 0;      // 0..1 enemy fog lifted
    this.shotsFired = 0;  // cannonballs the player has launched
    this.repairCd = 0;    // seconds until repair can be used again (rate cap vs turtling)
    this.over = false;
    this.won = false;
  }
}
