import { readFile, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const [input, output] = process.argv.slice(2);
if (!input || !output || input === output)
  throw new Error("Pass distinct input and output asset paths.");
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  const webp = async (bytes, mime) =>
    Buffer.from(
      await page.evaluate(
        async ({ data, mime }) => {
          const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
          const bitmap = await createImageBitmap(new Blob([bytes], { type: mime }));
          const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
          canvas.getContext("2d").drawImage(bitmap, 0, 0);
          bitmap.close();
          const blob = await canvas.convertToBlob({ type: "image/webp", quality: 0.94 });
          const encoded = new Uint8Array(await blob.arrayBuffer());
          let result = "";
          for (let i = 0; i < encoded.length; i += 16384)
            result += String.fromCharCode(...encoded.subarray(i, i + 16384));
          return btoa(result);
        },
        { data: bytes.toString("base64"), mime },
      ),
      "base64",
    );
  const source = await readFile(input);
  let result;
  if (input.endsWith(".glb")) {
    const jsonSize = source.readUInt32LE(12),
      json = JSON.parse(source.subarray(20, 20 + jsonSize).toString());
    const binary = source.subarray(28 + jsonSize),
      replacements = new Map();
    for (const image of json.images ?? []) {
      if (image.bufferView === undefined) throw new Error("Embedded textures required.");
      const view = json.bufferViews[image.bufferView];
      replacements.set(
        image.bufferView,
        await webp(
          binary.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength),
          image.mimeType,
        ),
      );
      image.mimeType = "image/webp";
    }
    const chunks = [];
    let offset = 0;
    for (let i = 0; i < json.bufferViews.length; i++) {
      const view = json.bufferViews[i],
        bytes =
          replacements.get(i) ??
          binary.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
      view.byteOffset = offset;
      view.byteLength = bytes.length;
      chunks.push(bytes);
      offset += bytes.length;
      const padding = (4 - (offset % 4)) % 4;
      if (padding) {
        chunks.push(Buffer.alloc(padding));
        offset += padding;
      }
    }
    for (const texture of json.textures ?? []) {
      texture.extensions = { ...texture.extensions, EXT_texture_webp: { source: texture.source } };
      delete texture.source;
    }
    json.extensionsUsed = [...new Set([...(json.extensionsUsed ?? []), "EXT_texture_webp"])];
    json.extensionsRequired = [
      ...new Set([...(json.extensionsRequired ?? []), "EXT_texture_webp"]),
    ];
    json.buffers[0].byteLength = offset;
    let encoded = Buffer.from(JSON.stringify(json));
    encoded = Buffer.concat([encoded, Buffer.alloc((4 - (encoded.length % 4)) % 4, 32)]);
    const header = Buffer.alloc(20);
    header.writeUInt32LE(0x46546c67);
    header.writeUInt32LE(2, 4);
    header.writeUInt32LE(28 + encoded.length + offset, 8);
    header.writeUInt32LE(encoded.length, 12);
    header.writeUInt32LE(0x4e4f534a, 16);
    const binHeader = Buffer.alloc(8);
    binHeader.writeUInt32LE(offset);
    binHeader.writeUInt32LE(0x004e4942, 4);
    result = Buffer.concat([header, encoded, binHeader, ...chunks]);
  } else result = await webp(source, "image/png");
  await writeFile(output, result);
  console.log(JSON.stringify({ inputBytes: source.length, outputBytes: result.length }));
} finally {
  await browser.close();
}
