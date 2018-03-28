#!/usr/bin/env node

// import * as meow from "meow";
const meow = require("meow");
// import * as chalk from "chalk";
const chalk = require("chalk");

const scan = require("./index.js");

const cli = meow(
  `
    Usage
      $ ${chalk.yellow("hickory")}
        - run a Hickory accessibility scan on url list from urls.json   
    
      $ ${chalk.yellow("hickory <sitemap-url>")}
        - run a Hickory accessibility scan on the sitemap url 
    
      $ ${chalk.yellow("hickory unum")}
        - run a Hickory accessibility scan on the production unum sitemap 

      $ ${chalk.yellow("hickory colonial")}
        - run a Hickory accessibility scan on the production colonial sitemap   
 
    Options
      --sample             Scan the first 3 urls (defaults to a sample size of 3)
      --sample <n>         Scan the first n urls (use any number)
      --sample <n1> <n2>   Scan the first n1 urls starting at url #n2 (zero based)

    Examples
      hickory unum --sample 5         // scans the first 5 urls of the unum.com sitemap
      hickory colonial --sample 3 20  // scans 3 urls of coloniallife.com starting at #20

    Other shortcuts
      unum-dev unum-acpt unum
      colonial-dev colonial-acpt colonial
 
`,
  {
    alias: {
      // v: "version",
      hi: "hickory"
      // s: "start",
      // run: "start"
    }
  }
);

// enable debug logging if one of the following flags are passed:
//    --debug
//    --verbose
if (cli.flags.debug) {
  debug.enable();
  debug.log("Debug logging enabled");
}

console.log("cli initiated!");
//console.log(cli.input);
scan.main(cli.input, cli.flags, cli.showHelp);
