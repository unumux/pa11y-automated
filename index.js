const pa11y = require('pa11y');
const rp = require('request-promise');
const {parseString} = require('xml2js');
const {promisify} = require('util');

async function main(){
    const xml = await getUrlsFromSitemap('https://www.unum.com/sitemap_unum.xml');
    const parsedXml = await parseXml(xml);
    const urls = parsedXml.urlset.url.map(function(url){
        return url.loc[0];
    })

    //console.log(urls);
    console.log(await scanUrls(urls));
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

    for (let x=0; x<urls.length; x++){
        try{
            const url = urls[x];
            console.log(url);
            const result = await pa11y(url);
            results.push(result);
            // console.log(result);
        }
        catch(e){
            console.log(e);
        }
    }

    return results;
}