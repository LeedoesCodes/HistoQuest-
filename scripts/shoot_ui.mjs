import { chromium } from "playwright";
import { mkdirSync } from "node:fs"; import { join } from "node:path";
const outDir = process.argv[2], base = process.argv[3] || "http://localhost:4174";
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 900, height: 680 } });
await page.goto(base, { waitUntil: "networkidle" }); await sleep(1200);
async function tap(gx, gy){ const bx=await page.locator("canvas").boundingBox(); const s=Math.min(bx.width/800,bx.height/600); await page.mouse.click(bx.x+(bx.width-800*s)/2+gx*s, bx.y+(bx.height-600*s)/2+gy*s); }
async function shot(n){ await page.screenshot({path:join(outDir,n)}); console.log("shot",n); }
await shot("01-menu.png");        // restyled arc cards + language toggle
await tap(400,198); await sleep(1500);
await shot("02-quiz.png");        // pre-test first question (restyled buttons)
await b.close();
