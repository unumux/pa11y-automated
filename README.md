# pa11y-automated (Hickory)

This is for creating a more automated approach to using the pa11y accessibility tool.

## Usage

* `node hickory` OR
* `node hickory unum` OR
* `node hickory colonial`

If you simply run `node hickory` it will look into the local urls.json file for a list of urls to scan.

If you want to scan an entire site using it's sitemap, use `node hickory unum` or `node hickory colonial`.

Quite often you will only want to scan a sample selection from all of the urls in the sitemap. For that use:

* `node hickory colonial --sample`
* `node hickory colonial --sample 5`
* `node hickory colonial --sample 10 3`

In the above examples:

* using `--sample` scans only the first three items in the sitemap.
* using `--sample <how-many>` scans the first how-many items in the sitemap.
* using `--sample <how-many> <start-here>` scans the first how-many items starting at start-here (zero indexed)

Instead of typing in the url of a sitemap file, you can also use shortcuts below:

* `node hickory unum`
* `node hickory unum-dev`
* `node hickory unum-acpt`
* `node hickory colonial`
* `node hickory colonial-dev`
* `node hickory colonial-acpt`
* `node hickory mySitemapUrl.xml` (experimental)

The current output generates a .html file after the scan.
