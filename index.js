var exports = (module.exports = {}); // attempting to call from the hickory.js CLI (part 1 of 3)

const rp = require("request-promise"); // fetches remote http call to our target sitemap xml file
const { promisify } = require("util"); // util to convert callback function into promise for sync/await usage
const { parseString } = require("xml2js"); // converts xml to JS object string
const parseXml = promisify(parseString); // transforms callback based xml2js into promise for sync/await usage
const pa11y = require("pa11y"); // our accessibility scanning tool (https://github.com/pa11y/pa11y)
const puppeteer = require("puppeteer"); // pa11y needs this Google dependency to control headless Chrome
const chalk = require("chalk"); // allows colors in terminal output messages
const fs = require("fs"); // allows JS file system access for creating html output report
const encode = require("js-htmlencode"); // allows html encoded code instead of actual html in html output report

// async function main() {
// attempting to call from the hickory.js CLI (part 2 of 3)
exports.main = async function(cliInput) {
  let urls = [];
  let blacklist = []; // skips url if it contains any of the ignoreIfContains entries in the urls.json file.
  let ignoredUrlsDuringScan = []; // the urls that were affected by ignoreIfContains matches
  let urlsThatFailedDuringScan = [];
  let sitemap = "local urls.json file";

  // load the urls.json file so we know what to ignore (even if we don't scan using the urls from here)
  let ujsonObj = await getUJsonObj();
  blacklist = ujsonObj.ignoreIfContains[0];
  urlsFromUjson = ujsonObj.urls[0];

  // cli with no options = use local list of urls from urls.json
  if (cliInput.length === 0) {
    urls = urlsFromUjson;
  } else {
    // cli with any options = use sitemap
    sitemap = prepCliSitemap(process.argv.slice(2));
    const xml = await getSitemap(sitemap); // use request-promise to get remote xml file of target sitemap
    const parsedXml = await parseXml(xml); // use xml2js's parseString to convert xml to string of js objects
    // loop through objects to extract the url node data into an array (because .map returns an array)
    urls = parsedXml.urlset.url.map(function(url) {
      return url.loc[0];
    });
    // apply CLI options to potentially filter the candidate url list
    urls = prepCliUrls(process.argv.slice(2), urls);
  }

  console.log(`Urls to scan: ${urls}`);
  let pa11yResultsObj = await scanUrls(
    urls,
    blacklist,
    ignoredUrlsDuringScan,
    urlsThatFailedDuringScan
  ); // run a pa11y scan on each url in the array

  printResultDetails(
    pa11yResultsObj.pa11yResults,
    urls.length,
    pa11yResultsObj.pa11yResults.length,
    ignoredUrlsDuringScan,
    urlsThatFailedDuringScan,
    pa11yResultsObj.pa11yIssuesTotal
  );
  outputResultDetails(
    pa11yResultsObj.pa11yResults,
    sitemap,
    urls.length,
    pa11yResultsObj.pa11yResults.length,
    ignoredUrlsDuringScan,
    urlsThatFailedDuringScan,
    pa11yResultsObj.pa11yIssuesTotal
  );
};
// attempting to call from the hickory.js CLI (part 3 of 3)
//main();

// function isInBlackList(url, blacklist) {
//   for (var x = 0; x < blacklist.length; x++) {
//     if (url.includes(blacklist[x])) {
//       return true; // substring from blacklist found in url
//     }
//   }
//   return false; // not in blacklist
// }
function blacklistCheck(url, blacklist) {
  const resultsObj = { isBlacklisted: false, blacklistMatch: null };
  for (var x = 0; x < blacklist.length; x++) {
    if (url.includes(blacklist[x])) {
      resultsObj.isBlacklisted = true;
      resultsObj.blacklistMatch = blacklist[x];
      return resultsObj; // substring from blacklist found in url
    }
  }
  return resultsObj; // not in blacklist
}

async function getUJsonObj() {
  const ujsonObj = { urls: [], ignoreIfContains: [] }; // obj to return with arrays of the arrays in urls.json
  try {
    var data = fs.readFileSync("urls.json", "utf8");
    let localUrls = JSON.parse(data);

    if (localUrls.urls.length > 0) {
      ujsonObj.urls.push(localUrls.urls);
    }
    if (localUrls.ignoreIfContains.length > 0) {
      ujsonObj.ignoreIfContains.push(localUrls.ignoreIfContains);
    }
    return ujsonObj;
  } catch (e) {
    console.log("Error reading url array from urls.json:", e.stack);
  }
}

async function getSitemap(url) {
  const results = await rp.get(url);
  return results;
}

async function scanUrls(
  urls,
  blacklist,
  ignoredUrlsDuringScan,
  urlsThatFailedDuringScan
) {
  const results = [];
  let tempUrl = null;
  let totalA11yIssueCount = 0;
  const resultsObj = {
    pa11yResults: [],
    pa11yIssuesTotal: 0
  };
  let browser = await puppeteer.launch({
    // open a single browser and don't close it until all urls are scanned
    ignoreHTTPSErrors: true
  });

  for (let x = 0; x < urls.length; x++) {
    try {
      const url = urls[x];

      //if (isInBlackList(url, blacklist)) {
      let blacklistCheckResults = blacklistCheck(url, blacklist);
      if (blacklistCheckResults.isBlacklisted) {
        ignoredUrlsDuringScan.push(
          `${url} BLACKLIST MATCH: ${blacklistCheckResults.blacklistMatch}`
        );
        continue; // skip this iteration of the loop
      }
      tempUrl = url;
      const result = await pa11y(url, { browser: browser }); // scan url w/ pa11y
      totalA11yIssueCount += result.issues.length;
      printResultNow(result, x, urls.length);

      // default behavior filters out urls with no problems in final report
      if (result.issues.length != 0) {
        results.push(result);
      }
    } catch (e) {
      console.log(chalk`{red Error scanning ${tempUrl}}`);
      urlsThatFailedDuringScan.push(tempUrl);
    }
  }
  await browser.close();
  // return results;
  resultsObj.pa11yResults = results;
  resultsObj.pa11yIssuesTotal = totalA11yIssueCount;
  return resultsObj;
}

function printResultNow(r, currentItem, totalItems) {
  const percent = ((currentItem + 1) / totalItems * 100).toFixed(0);
  console.log(
    `${percent}% complete. ${r.issues.length} issues for ${r.pageUrl}`
  );
}

function printResultDetails(
  results,
  totalUrlCount,
  totalPageErrorCount,
  ignoredUrlsDuringScan,
  urlsThatFailedDuringScan,
  pa11yIssuesTotal
) {
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

  console.log(chalk`{yellow Number of urls: ${totalUrlCount}}`);
  console.log(
    chalk`{yellow Number of pages with errors: ${totalPageErrorCount}}`
  );
  console.log(
    chalk`{yellow Number of total pa11y errors: ${pa11yIssuesTotal}}`
  );

  if (urlsThatFailedDuringScan.length > 0) {
    console.log(chalk`{cyan Errors scanning these urls:}`);
    urlsThatFailedDuringScan.map(i => console.log(chalk`{red ${i}}`));
  }
  if (ignoredUrlsDuringScan.length > 0) {
    console.log(
      chalk`{cyan Urls skipped by matching the ignoredUrlsDuringScan patterns in urls.json:}`
    );
    ignoredUrlsDuringScan.map(i => console.log(chalk`{green ${i}}`));
  }
}

function outputResultDetails(
  results,
  sitemap,
  totalUrlCount,
  totalPageErrorCount,
  ignoredUrlsDuringScan,
  urlsThatFailedDuringScan,
  pa11yIssuesTotal
) {
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
    .item-url, .log-scan-error, .item-url a, .log-scan-error a{
        color: crimson;
    }
    .log-scan-ignored{
        color: brown;
    }
    .log-issue-item-context{
        color: teal;
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
    <div><strong>Number of urls:</strong> ${totalUrlCount}</div>
    <div><strong>Number of pages with a11y errors:</strong> ${totalPageErrorCount}</div>
    <div><strong>Number of total a11y errors:</strong> ${pa11yIssuesTotal}</div>
    <div><br>Debugging hint:
      <ol>
        <li>Copy the error selector. Example: html &gt; body &gt; img:nth-child(22) </li>
        <li>Open Chrome dev tools to the page with the error (F12 on PC, option+command+i on Mac)</li>
        <li>Click into the html tree of the Elements tab</li>
        <li>Ctrl+f (command+f for Mac) to find ... paste and search for the error selector that you copied</li>
      </ol>
    <hr>`;

  if (urlsThatFailedDuringScan.length > 0) {
    x += `<h2>Errors scanning these urls (${
      urlsThatFailedDuringScan.length
    })</h2>`;
    urlsThatFailedDuringScan.map(
      i => (x += `<div class="log-scan-error"><a href="${i}">${i}</a></div>`)
    );
  }

  if (ignoredUrlsDuringScan.length > 0) {
    x += `<h2>Urls skipped by matching the ignoredUrlsDuringScan patterns in urls.json (${
      ignoredUrlsDuringScan.length
    })</h2>`;
    ignoredUrlsDuringScan.map(
      i => (x += `<div class="log-scan-ignored">${i}</div>`)
    );
  }

  if (urlsThatFailedDuringScan.length > 0 || ignoredUrlsDuringScan.length > 0) {
    x += `<hr>`;
  }

  // each page
  results.forEach(function(result, i) {
    // each issue per page
    result.issues.forEach(function(issue, i) {
      x += `<div class="log-issue-item-count"><strong>Issue ${i + 1} of ${
        result.issues.length
      }</strong> for <span class="item-url"><a href="${result.pageUrl}">${
        result.pageUrl
      }</a></span></div>\r\n
      <div class="log-issue-item-context">${encode(issue.context)}</div>\r\n
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

function prepCliSitemap(args) {
  let sitemap = "https://www.unum.com/sitemap_unum.xml"; // default

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
  }
  return sitemap;
}

function prepCliUrls(args, urls) {
  let sampleIsActivated = false;
  let sampleStart = 0; // defaults to start of xml file
  let sampleAmount = 3; // defaults to 3 items

  if (args.length > 0) {
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

    if (sampleIsActivated) {
      urls = urls.splice(sampleStart, sampleAmount);
    }
    return urls;
  }
}
