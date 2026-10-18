import glove from "@/assets/slott/glove.webp";
import pistol from "@/assets/slott/pistol.webp";
import knife from "@/assets/slott/knife.webp";
import helmet from "@/assets/slott/helmet.webp";
import vest from "@/assets/slott/vest.webp";
import chestGold from "@/assets/slott/chest-gold.webp";
import grenade from "@/assets/slott/grenade.webp";
import wild from "@/assets/slott/wild.webp";
import crystal from "@/assets/slott/crystal.webp";
import lightning from "@/assets/slott/lightning.webp";
import skull from "@/assets/slott/skull.webp";
import crown from "@/assets/slott/crown.webp";
import star from "@/assets/slott/star.webp";
import fire from "@/assets/slott/fire.webp";
import wCoin from "@/assets/slott/w-coin.webp";
import gasMask from "@/assets/slott/gas-mask.webp";
import dragonCoin from "@/assets/slott/dragon-coin.webp";
import diamond from "@/assets/slott/diamond.webp";
import chestPurple from "@/assets/slott/chest-purple.webp";
import dragon from "@/assets/slott/dragon.webp";
import bomb from "@/assets/slott/bomb.png";

import { BOMB } from "./paytable";

export { SLOT_STAGE } from "./stage";

/** Indexed by paytable symbol id. */
export const SYMBOL_IMG: string[] = [
  glove,
  pistol,
  knife,
  helmet,
  vest,
  chestGold,
  grenade,
  wild,
  crystal,
  lightning,
  skull,
  crown,
  star,
  fire,
  wCoin,
  gasMask,
  dragonCoin,
  diamond,
  chestPurple,
  dragon,
];

SYMBOL_IMG[BOMB] = bomb;
