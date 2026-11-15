import assert from "node:assert/strict";
import { buildThumbnailPrompt, thumbnailHook } from "./generate-long-video-thumbnails.mjs";

const title = "Smartphone Samsung Galaxy A36 5G 128GB";
const hook = thumbnailHook(title, "Samsung Galaxy A36 5G vale a pena? Review completo", "mntave2c5So");
assert.ok(hook.length > 0);
assert.ok(hook.split(/\s+/).length <= 4, "thumbnail hook must have at most four words");
assert.ok(!/Samsung|Galaxy|A36/i.test(hook), "thumbnail hook must complement, not repeat, the title");

const prompt = buildThumbnailPrompt(title, "Smartphone");
assert.match(prompt, /RIGHT 58 percent/i);
assert.match(prompt, /LEFT 42 percent/i);
assert.match(prompt, /exact physical product/i);
assert.match(prompt, /NO TEXT OR GRAPHICS/i);
assert.match(prompt, /16:9/);

const headphoneHook = thumbnailHook("Fone de Ouvido QCY HT08 Melobuds Pro", "QCY HT08 Melobuds Pro review", "rQasZbUzGrU");
assert.ok(headphoneHook.includes("SOM") || headphoneHook.includes("RUÍDO") || headphoneHook.includes("COMPENSA"));

console.log("Thumbnail prompt and complementary headline tests passed.");
