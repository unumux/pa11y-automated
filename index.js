const pa11y = require('pa11y');
const rp = require('request-promise');
const {parseString} = require('xml2js');
const {promisify} = require('util');
const puppeteer = require('puppeteer');



async function main(){
    const xml = await getUrlsFromSitemap('https://www.unum.com/sitemap_unum.xml');
    const parsedXml = await parseXml(xml);
    const urls = parsedXml.urlset.url.map(function(url){
        return url.loc[0];
    })

    // urls is an array of url strings

    // let's make a smaller sample of all those urls for faster testing
    const urlsSample = urls.splice(0,3);

    // display the urls we will attempt to process
    console.log(urlsSample);
    // console.log(urls);

    //console.log(await scanUrls(urls));
    //console.log(await scanUrls(urlsSample));
    await scanUrls(urlsSample);
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

async function getUrlsFromSitemap(url){
    const results = await rp.get(url);
    return results;
}

async function scanUrls(urls){
    const results = [];
    let browser = await puppeteer.launch({
        ignoreHTTPSErrors: true
    });
    
    for (let x=0; x<urls.length; x++){
        try{

            const url = urls[x];
            console.log(url);
            //const result = await pa11y(url);
            const result = await pa11y(url, {browser: browser});
            results.push(result);
            // console.log(result);
            iReport(result);
        }
        catch(e){
            console.log(e);

            if (browser) {
                return await browser.close();
            }

        }
    }
    await browser.close();
    return results;
}

function iReport(r){
	console.log("####################################");
	console.log('\x1b[36m%s\x1b[0m', r.pageUrl);
	console.log('\x1b[36m%s\x1b[0m', r.issues.length + " issues reported.")
	console.log("####################################");
	console.log("");
	r.issues.forEach(function(entry, i) {
		console.log('\x1b[31m%s\x1b[0m', 'Issue ' + (i+1) + ' of ' + r.issues.length + ' for ' + '\x1b[36m' + r.pageUrl)
		console.log(entry.message); 
		console.log("");
		console.log(entry.selector);
		console.log("");
		console.log("----------");
		console.log("");
	});
}