# pa11y-automated (Hickory)

This is for creating a more automated approach to using the pa11y accessibility tool.

## Usage

* `node hic` OR
* `node hic unum` OR
* `node hic colonial`

If you simply run `node hic` it will look into the local urls.json file for a list of urls to scan.

If you want to scan an entire site using it's sitemap, use `node hic unum` or `node hic colonial`.

Quite often you will only want to scan a sample selection from all of the urls in the sitemap. For that use:

* `node hic colonial --sample`
* `node hic colonial --sample 5`
* `node hic colonial --sample 10 3`

In the above examples:

* using just `--sample` scan's only the first three items in the sitemap.
* using `--sample <target> <how-many>` scan's the first how-many items in the sitemap.
* using `--sample <target> <start-here> <how-many>` scans the first how-many items starting at start-here (zero indexed)

Instead of typing in the url of a sitemap file, you can also use shortcuts below:

* `node hic unum`
* `node hic unum-dev`
* `node hic unum-acpt`
* `node hic colonial`
* `node hic colonial-dev`
* `node hic colonial-acpt`
* `node hic mySitemapUrl.xml` (experimental)

The current output generates a .html file after the scan.
