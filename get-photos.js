const csv = require("fast-csv");
const rp = require("request-promise");
const cheerio = require("cheerio");
const fs = require("fs-extra");

const getPhotoUrl = ASIN => {
  const URL = `https://www.amazon.com/x/dp/${ASIN}`;
  console.log(`Grabbing product image from ${URL}`);

  // GET the page, parse with cheerio
  return rp({
    uri: URL,
    gzip: true,
    transform(body) {
      return cheerio.load(body);
    }
  }).then($ => {
    // get the first img element descendend from main-image-container
    const image = $("#main-image-container img, #mainImageContainer img")
      .first()
      .attr("src")
      .trim();

    // strip out the metadata at the beginning of the img source
    return image.replace(/^data:image\/jpeg;base64,/, "");
  });
};

let count = 0; // use count integer for image filenames

const csvPath = process.argv[2];

// parse the csv of orders
const csvstream = csv
  .fromPath(csvPath, { headers: true })
  .on("data", row => {
    // pause the csv stream until we've finished scraping this row
    csvstream.pause();

    // get the produt's ASIN (unique ID)
    const ASIN = row["ASIN/ISBN"];
    getPhotoUrl(ASIN)
      .then(base64Data => {
        // write the image to file
        fs.outputFile(
          `tmp/${count}.jpg`,
          Buffer.from(base64Data, "base64"),
          () => {
            count += 1; // increment count
          }
        );
      })
      .catch(err => {
        // if there's an error scraping an image for this row, ignore it
        console.error("Oops, couldn't get an image...", err);
      })
      .then(() => {
        csvstream.resume(); // resume reading from the csv
      });
  })
  .on("end", () => {
    console.log("Done!");
  })
  .on("error", error => {
    console.error(error);
  });
