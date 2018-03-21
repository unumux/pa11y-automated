const pa11y = require("pa11y");
const rp = require("request-promise");
const { parseString } = require("xml2js");
const { promisify } = require("util");
const puppeteer = require("puppeteer");
const fs = require("fs");

const timeStampBegin = getTimeStamp();
let timeStampEnd = null;
let thelog = prepHtml();
let sitemapTarget = "https://www.unum.com/sitemap_unum.xml"; // default

let sampleIsActivated = false;
let sampleStart = 0; // defaults to start of xml file
let sampleAmount = 3; // defaults to 3 items

var args = process.argv.slice(2);
if (args.length > 0) {
    if (args[0] === "unum") {
        sitemapTarget = "https://www.unum.com/sitemap_unum.xml";
    } else if (args[0] === "unum-dev") {
        sitemapTarget = "http://dev1.unum.com/sitemap_unum.xml";
    } else if (args[0] === "unum-acpt") {
        sitemapTarget = "http://acpt.unum.com/sitemap_unum.xml";
    } else if (args[0] === "colonial") {
        sitemapTarget = "https://www.coloniallife.com/sitemap_colonial.xml";
    } else if (args[0] === "colonial-dev") {
        sitemapTarget = "http://dev1.unum.com/sitemap_colonial.xml";
    } else if (args[0] === "colonial-acpt") {
        sitemapTarget = "http://acpt.unum.com/sitemap_colonial.xml";
    } else if (args[0].endsWith(".xml")) {
        sitemapTarget = args[0].trim();
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
console.log(`Attempting to run Pa11y scan on ${sitemapTarget} ...`);
thelog += `<h1>Automated Pa11y Scan</h1>`;
thelog += `<div><strong>Target:</strong> ${sitemapTarget}</div>`;
thelog += `<div><strong>Started:</strong> ${timeStampBegin}</div>`;
thelog += "<hr>";

async function main() {
    const xml = await getUrlsFromSitemap(sitemapTarget);
    const parsedXml = await parseXml(xml);
    let urls = parsedXml.urlset.url.map(function(url) {
        return url.loc[0];
    });

    // urls is an array of url strings

    // let's make a smaller sample of all those urls for faster testing (optional. comment below line to run entire sitemap)
    if (sampleIsActivated) {
        // urls = urls.splice(0,3);
        urls = urls.splice(sampleStart, sampleAmount);
    }

    // display the urls we will attempt to process
    console.log(urls);

    //console.log(await scanUrls(urls));
    await scanUrls(urls);
}

main();

const parseXml = promisify(parseString);
// function parseXml(xml){
//     return new Promise(function(resolve, reject){
//         parseString(xml, function(err, results){
//             if (err){
//                 reject(err);
//             }
//             else{
//                 resolve(results);
//             }
//         });
//     });
// }

async function getUrlsFromSitemap(url) {
    const results = await rp.get(url);
    return results;
}

async function scanUrls(urls) {
    const results = [];
    let browser = await puppeteer.launch({
        ignoreHTTPSErrors: true
    });

    for (let x = 0; x < urls.length; x++) {
        try {
            const url = urls[x];
            // console.log(url);
            const result = await pa11y(url, { browser: browser });
            results.push(result);
            // console.log(result);
            iReport(result);
        } catch (e) {
            console.log(e);

            if (browser) {
                return await browser.close();
            }
        }
    }
    await browser.close();
    timeStampEnd = getTimeStamp();
    console.log(`Writing report to ${timeStampEnd}_output.html...`);
    saveOutputToFile(thelog);
    thelog += "</body></html>";
    return results;
}

function iReport(r) {
    thelog +=
        `\r\n\r\n<div class="log-issue-page"><a href="${r.pageUrl}">${
            r.pageUrl
        }</a></div>` + "\r\n";
    thelog +=
        `<div class="log-issue-summary">${
            r.issues.length
        } issues reported.</div>` + "\r\n";
    r.issues.forEach(function(entry, i) {
        thelog +=
            `<div class="log-issue-item-count"><strong>Issue ${i + 1} of ${
                r.issues.length
            }</strong> for <span class="item-url">${r.pageUrl}</span></div>` +
            "\r\n";
        thelog +=
            `<div class="log-issue-item-message">${entry.message}</div>` +
            "\r\n";
        thelog +=
            `<div class="log-issue-item-selector">${entry.selector}</div>` +
            "\r\n\r\n";
    });
    thelog += "<hr>" + "\r\n";
}

function saveOutputToFile(thelog) {
    fs.writeFile(`${timeStampEnd}_output.html`, thelog, function(err) {
        if (err) throw err;
    });
}

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

function prepHtml() {
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
    </style>
</head>
<body>`;
    return x;
}
