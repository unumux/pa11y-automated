# pa11y-automated (Hickory)

This is for creating a more automated approach to using the pa11y accessibility tool.

## Usage

* `hickory` OR
* `hickory unum` OR
* `hickory colonial`

> If you simply run `hickory` it will look into the local **urls.json** file for a list of urls to scan.

If you want to scan an entire site using it's sitemap, use `hickory unum` or `hickory colonial`.

Quite often you will only want to scan a sample selection from all of the urls in the sitemap. For that use:

* `hickory colonial --sample`
* `hickory colonial --sample 5`
* `hickory colonial --sample 10 3`

In the above examples:

* using `--sample` scans only the first three items in the sitemap.
* using `--sample <how-many>` scans the first how-many items in the sitemap.
* using `--sample <how-many> <start-here>` scans the first how-many items starting at start-here (zero indexed)

Instead of typing in the url of a sitemap file, you can also use shortcuts below:

* `hickory unum`
* `hickory unum-dev`
* `hickory unum-acpt`
* `hickory colonial`
* `hickory colonial-dev`
* `hickory colonial-acpt`
* `hickory mySitemapUrl.xml` (experimental)

The current output generates a .html file after the scan.
