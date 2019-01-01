const fs = require('fs-extra');
const sharp = require('sharp');
const jpeg = require('jpeg-js');
const Canvas = require('canvas');
const mergeImages = require('merge-images');
const { orderBy } = require('natural-orderby');

const outputPath = './output/amazon-collage.jpg';

const filenames = fs.readdirSync('tmp');
const sortedFilenames = orderBy(filenames, [v => v], ['asc']);

const gridWidth = 16; // images per row
const gridHeight = Math.ceil(filenames.length / gridWidth); // number of rows

// dimensions and padding for each image
const cellPadding = 20;
const imageDimension = 300; // images will be scaled to this number of pixels square
const cellDimension = imageDimension + cellPadding + cellPadding;

// padding around the edges of the collage
const outputPadding = 200;

// final collage dimensions
const outputWidth = (cellDimension * gridWidth) + outputPadding + outputPadding;
const outputHeight = (cellDimension * gridHeight) + outputPadding + outputPadding;

async function processFiles(files) {
  // iterate over source images
  for (let i = 0; i < files.length; i += 1) {
    console.log(`Processing ${files[i]}`);

    // set x and y to the top left of the cell
    let x = ((i % gridWidth) * cellDimension);
    let y = (Math.floor(i / gridWidth) * cellDimension);


    // add left and top padding to the cell
    x += cellPadding + outputPadding;
    y += cellPadding + outputPadding;

    // further modify x and y if image is not 300 x 300
    const jpegData = fs.readFileSync(`./tmp/${filenames[i]}`);
    const resized = await sharp(jpegData)
      .resize(imageDimension, imageDimension, {
        fit: 'contain',
        background: '#FFFFFF',
      })
      .toBuffer();


    await mergeImages([
      { src: outputPath, x: 0, y: 0 },
      { src: resized, x, y },
    ], {
      Canvas,
      format: 'image/jpeg',
    })
      .then((b64) => {
        const base64Data = b64.trim().replace(/^data:image\/jpeg;base64,/, '');
        fs.writeFileSync(outputPath, Buffer.from(base64Data, 'base64'));
      })
      .catch((err) => {
        console.log(err);
      });
  }

  console.log(`Done! Output saved to ${outputPath}`);
}

const frameData = Buffer.alloc(outputWidth * outputHeight * 4);

let i = 0;
while (i < frameData.length) {
  frameData[i += 1] = 0xFF; // red
  frameData[i += 1] = 0xFF; // green
  frameData[i += 1] = 0xFF; // blue
}

const rawImageData = {
  data: frameData,
  width: outputWidth,
  height: outputHeight,
};

const jpegImageData = jpeg.encode(rawImageData, 100);

fs.outputFile(outputPath, jpegImageData.data, () => {
  processFiles(sortedFilenames);
});
