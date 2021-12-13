import path from "path";
import fs from "fs/promises";
import { constants } from "fs";

import { optimize, createContentItem } from "svgo";

let ICONS_PATH = path.join(process.cwd(), "icons");

let OUTDIR = path.join(process.cwd(), "app/icons");

async function createDirIfNeeded(dir) {
  try {
    await fs.access(dir, constants.F_OK);
    return;
  } catch (error) {
    await fs.mkdir(dir);
  }
}

async function wrapSymbol(inputPath, outputDir) {
  let ext = path.extname(inputPath);
  let base = path.basename(inputPath, ext);
  let content = await fs.readFile(inputPath, "utf-8");
  let fileName = `${base}.svg`;
  let outputPath = path.join(outputDir, fileName);

  let result = optimize(content, {
    path: inputPath,
    plugins: [
      {
        name: "preset-default",
      },
      {
        name: "removeViewBox",
        active: false,
      },
      {
        name: "removeDimensions",
        active: true,
      },
      {
        name: "wrapInSymbol",
        type: "perItem",
        fn: (item) => {
          if (item.type === "element") {
            if (item.name === "svg") {
              let { xmlns, ...attributes } = item.attributes;

              for (let attribute in attributes) {
                if (Object.hasOwnProperty.call(attributes, attribute)) {
                  delete item.attributes[attribute];
                }
              }

              let children = item.children;

              item.children = [
                createContentItem({
                  type: "element",
                  name: "symbol",
                  attributes: { ...attributes, id: base },
                  children,
                }),
              ];
            }
          }
        },
      },
    ],
  });

  let optimizedSvgString = result.data;

  await fs.writeFile(outputPath, optimizedSvgString);
  console.log(`${fileName} created`);
}

async function compile() {
  await createDirIfNeeded(OUTDIR);

  let icons = await fs.readdir(ICONS_PATH);

  for (let icon of icons) {
    await wrapSymbol(path.join(ICONS_PATH, icon), OUTDIR);
  }
}

compile();
