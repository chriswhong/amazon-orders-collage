const fs = require('fs-extra');
const puppeteer = require('puppeteer');
const { orderBy } = require('natural-orderby');

const outputPath = './output/amazon-collage.jpg';

const filenames = fs.readdirSync('tmp');
const sortedFilenames = orderBy(filenames, [v => v], ['asc']);

const gridWidth = 16; // images per row

// dimensions and padding for each image
const cellPadding = 20;
const imageDimension = 300; // images will be scaled to this number of pixels square

// padding around the edges of the collage
const outputPadding = 200;

const takeScreenshot = async (htmlPath) => {
  const browser = await puppeteer.launch({
    defaultViewport: {
      height: imageDimension + (2 * outputPadding), // this is really just the minimum height
      width: imageDimension * gridWidth,
    },
  });
  const page = await browser.newPage();

  page.on('error', console.error);

  await page.goto(`file://${__dirname}/${htmlPath}`);
  await page.screenshot({
    fullPage: true,
    omitBackground: true,
    path: outputPath,
  });
  return browser.close();
};

const getHTML = (imageFiles) => {
  const images = imageFiles.map(url => `<img src="file://${__dirname}/tmp/${url}" />`);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        * {
          margin: 0;
          padding: 0;
        }
        body {
          padding: ${outputPadding}px;
        }
        img {
          height: ${imageDimension}px;
          margin: ${cellPadding}px;
          object-fit: contain;
          width: ${imageDimension}px;
        }
      </style>
      <script>
        // hide broken images
        // https://stackoverflow.com/a/22051972/358804
        document.addEventListener("DOMContentLoaded", function(event) {
          document.querySelectorAll('img').forEach(function(img){
            img.onerror = function() {
              this.style.display='none';
            };
          })
        });
      </script>
    </head>
    <body>
      ${images.join('\n')}
    </body>
    </html>`;
};

async function processFiles(files) {
  const html = getHTML(files);
  const htmlPath = './output/index.html';
  await fs.writeFile(htmlPath, html);
  await takeScreenshot(htmlPath);

  console.log(`Done! Output saved to ${outputPath}`);
}

processFiles(sortedFilenames);
