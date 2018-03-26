const rp = require("request-promise"); // fetches remote http call to our target sitemap xml file
const { promisify } = require("util"); // util to convert callback function into promise for sync/await usage
const { parseString } = require("xml2js"); // converts xml to JS object string
const parseXml = promisify(parseString); // transforms callback based xml2js into promise for sync/await usage
const pa11y = require("pa11y"); // our accessibility scanning tool (https://github.com/pa11y/pa11y)
const puppeteer = require("puppeteer"); // pa11y needs this Google dependency to control headless Chrome
const chalk = require("chalk"); // allows colors in terminal output messages
const fs = require("fs"); // allows JS file system access for creating html output report
const encode = require("js-htmlencode"); // allows html encoded code instead of actual html in html output report

let sitemap = "https://www.unum.com/sitemap_unum.xml"; // may be cli argument

let sampleIsActivated = false;
let sampleStart = 0; // defaults to start of xml file
let sampleAmount = 3; // defaults to 3 items

async function main() {
  console.log("starting...");

  prepCliOptions(process.argv.slice(2));

  const xml = await getSitemap(sitemap); // use request-promise to get remote xml file of target sitemap
  const parsedXml = await parseXml(xml); // use xml2js's parseString to convert xml to string of js objects
  // loop through objects to extract the url node data into an array (because .map returns an array)
  let urls = parsedXml.urlset.url.map(function(url) {
    return url.loc[0];
  });
  // let's make a smaller sample of all those urls for faster testing (optional. comment below line to run entire sitemap)
  if (sampleIsActivated) {
    urls = urls.splice(sampleStart, sampleAmount);
  }
  console.log(urls);
  let pa11yResults = await scanUrls(urls); // run a pa11y scan on each url in the array
  printResultDetails(pa11yResults);
  outputResultDetails(pa11yResults);
}
main();

async function getSitemap(url) {
  const results = await rp.get(url);
  return results;
}

async function scanUrls(urls) {
  const results = [];
  let browser = await puppeteer.launch({
    // open a single browser and don't close it until all urls are scanned
    ignoreHTTPSErrors: true
  });

  for (let x = 0; x < urls.length; x++) {
    try {
      const url = urls[x];
      const result = await pa11y(url, { browser: browser }); // scan url w/ pa11y
      printResultNow(result, x, urls.length);

      // default behavior filters out urls with no problems in final report
      if (result.issues.length != 0) {
        results.push(result);
      }
    } catch (e) {
      console.log(e);

      if (browser) {
        return await browser.close();
      }
    }
  }
  await browser.close();
  return results;
}

function printResultNow(r, currentItem, totalItems) {
  const percent = ((currentItem + 1) / totalItems * 100).toFixed(0);
  console.log(
    `${percent}% complete. ${r.issues.length} issues for ${r.pageUrl}`
  );
}

function printResultDetails(results) {
  console.log(``);
  console.log(chalk`{magenta ---------------}`);
  console.log(chalk`{magenta Scan Details}`);
  console.log(chalk`{magenta ---------------}`);
  console.log(``);
  // each page
  results.forEach(function(result) {
    console.log(chalk`{green ${result.pageUrl}}`);
    console.log(chalk`{red ${result.issues.length} issue(s)}`);
    // each issue per page
    result.issues.forEach(function(issue, i) {
      console.log(``);
      console.log(chalk`{red Issue ${i + 1}} for {green ${result.pageUrl}}`);
      console.log(`${issue.context}`);
      console.log(``);
      console.log(`${issue.message}`);
      console.log(``);
      console.log(`${issue.selector}`);
    });
    console.log(``);
    console.log(chalk`{magenta ---------------}`);
    console.log(``);
  });
}

function outputResultDetails(results) {
  let timeStampEnd = getTimeStamp();
  let x = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Pa11y Automated Report</title>
    <style>
    hr{
        margin-top: 1rem;
        margin-bottom: 1rem;
    }
    a{
        color:blue;
    }
    .log-issue-item-selector, .log-issue-summary{
        margin-bottom: .5rem;
    }
    .item-url{
        color: crimson;
    }
    .log-issue-item-message{
      color: blue;
    }
    </style>
</head>
<body>
    <h1>Automated Pa11y Scan</h1>
    <div><strong>Target:</strong> ${sitemap}</div>
    <div><strong>Ended:</strong> ${timeStampEnd}</div>
    <hr>`;
  // each page
  results.forEach(function(result, i) {
    // each issue per page
    result.issues.forEach(function(issue, i) {
      x += `<div class="log-issue-item-count"><strong>Issue ${i + 1} of ${
        result.issues.length
      }</strong> for <span class="item-url">${result.pageUrl}</span></div>\r\n
      <div class="log-issue-item-message">${encode(issue.context)}</div>\r\n
      <div class="log-issue-item-message">${issue.message}</div>\r\n
      <div class="log-issue-item-selector">${issue.selector}</div>\r\n\r\n`;
    });
    x += `<hr>`;
  });
  x += `</body></html>`;

  // save output to html formatted report
  fs.writeFile(`${timeStampEnd}_output.html`, x, function(err) {
    if (err) throw err;
  });

  console.log(`Html report saved as ${timeStampEnd}_output.html`);

  function getTimeStamp() {
    let now = new Date();
    let YY = now.getFullYear();
    let MM = twodigit(now.getMonth() + 1);
    let DD = twodigit(now.getDate());
    var HH = twodigit(now.getHours());
    var MI = twodigit(now.getMinutes());
    var SS = twodigit(now.getSeconds());
    return `${YY}-${MM}-${DD}_${HH}:${MI}:${SS}`;

    function twodigit(x) {
      // this little guy is just for this function
      x = ("0" + x).slice(-2);
      return x;
    }
  }
}

function prepCliOptions(args) {
  if (args.length > 0) {
    if (args[0] === "unum") {
      sitemap = "https://www.unum.com/sitemap_unum.xml";
    } else if (args[0] === "unum-dev") {
      sitemap = "http://dev1.unum.com/sitemap_unum.xml";
    } else if (args[0] === "unum-acpt") {
      sitemap = "http://acpt.unum.com/sitemap_unum.xml";
    } else if (args[0] === "colonial") {
      sitemap = "https://www.coloniallife.com/sitemap_colonial.xml";
    } else if (args[0] === "colonial-dev") {
      sitemap = "http://dev1.unum.com/sitemap_colonial.xml";
    } else if (args[0] === "colonial-acpt") {
      sitemap = "http://acpt.unum.com/sitemap_colonial.xml";
    } else if (args[0].endsWith(".xml")) {
      sitemap = args[0].trim();
    }
    // check for sample mode
    const sampleArgLoc = args.indexOf("--sample");

    if (sampleArgLoc > -1) {
      if (sampleArgLoc === args.length - 1) {
        // console.log(`--sample is the last argument`);
        sampleIsActivated = true;
        console.log(
          "Mode sample-size activated!  Grabbing the first three items."
        );
      } else if (sampleArgLoc === args.length - 2) {
        // console.log(`--sample has one following argument`);
        sampleIsActivated = true;
        sampleAmount = args[sampleArgLoc + 1];
        console.log(
          `Mode sample-size activated!  Grabbing the first ${sampleAmount} items.`
        );
      } else if (sampleArgLoc === args.length - 3) {
        // console.log(`--sample has two following arguments`);
        sampleIsActivated = true;
        sampleAmount = args[sampleArgLoc + 1];
        sampleStart = args[sampleArgLoc + 2];
        console.log(
          `Mode sample-size activated!  Grabbing ${sampleAmount} items starting at item ${sampleStart}.`
        );
      }
    }
  }
}
