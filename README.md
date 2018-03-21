# pa11y-automated
This is for creating a more automated approach to using the pa11y accessibility tool.

## Usage

* node index.js

The default will target the unum production sitemap.  However you can quickly target others with:

* `node index.js unum`
* `node index.js unum-dev`
* `node index.js unum-acpt`
* `node index.js colonial`
* `node index.js colonial-dev`
* `node index.js colonial-acpt`
* `node index.js mysitemapurl.xml` (experimental)

You can also scan sample-sized parts:

* `node index.js --sample`
* `node index.ss --sample 5`
* `node index.js --sample 10 3`

In the above examples: 

* using just `--sample` scan's only the first three items in the sitemap.
* using `--sample <how-many>` scan's the first how-many items in the sitemap.
* using `--sample <start-here> <how-many>` scans the first how-many items starting at start-here (zero indexed)

The current output generates a .html file after the scan.
