#!/usr/bin/env node
'use strict';

var process = require('process');
var fs = require('fs');
var path = require('path');
var webpack = require('webpack');
var genWebpackConfigProd = require('../config/webpack.config.prod');

var realCwd = fs.realpathSync(process.cwd());

function printErrors(summary, errors) {
  console.error(summary);
  console.log();
  errors.forEach(err => {
    console.log(err.message || err);
    console.log();
  });
}

function build(args) {
  if (args.length < 2) {
    console.error('Need build args: entry outputPath');
    process.exit(1);
  }

  var entry = path.resolve(realCwd, args[0]);
  var outputPath = path.resolve(realCwd, args[1]);

  var webpackConfigProd = genWebpackConfigProd(entry, outputPath);

  console.log('Building ...');
  webpack(webpackConfigProd).run((err, stats) => {
    if (err) {
      console.error(err.stack || err);
      if (err.details) {
        console.error(err.details);
      }
      process.exit(1);
    }

    var info = stats.toJson();

    if (stats.hasErrors()) {
      printErrors('ERRORS', info.errors);
      process.exit(1);
    }

    if (stats.hasWarnings()) {
      printErrors('WARNINGS', info.errors);
    }

    console.log('Build done.');
  });
}

var script = process.argv[2];
var args = process.argv.slice(3);

switch (script) {
  case 'build':
    build(args);
    break;

  default:
    console.log('Unrecognized command');
    break;
}
