"use strict";

// Load Plugins
const browserSync = require("browser-sync").create();
const del = require('del');
const gulp = require('gulp');
const argv = require('yargs').argv;
const beautify = require('gulp-beautify');
const inject = require('gulp-inject-string');
const mergeStream = require('merge-stream');

/**
 * Set the destination/production directory
 * This is where the project is compiled and exported for production.
 * This folder is auto created and managed by gulp.
 * Do not add/edit/save any files or folders iside this folder. They will be deleted by the gulp tasks.
*/
const distDir = './public/';

// Variables can be adjusted via command line arguments. Example:
//   npm run start -- --clean_disabled --port 8080 --browser chromium
// Overwrites in config.js have priority over command line arguments.

var soffice_base_url = argv.soffice_base_url;

var custom_browser = argv.browser;  // else use default system browser
var custom_listen = argv.listen || '127.0.0.1';
var custom_port = argv.port || 3000;
var clean_disabled = argv.clean_disabled;
var no_browser = argv.nobrowser;


// Clean up the dist folder before running any task
function clean() {
  if (clean_disabled) return Promise.resolve();
  return del(distDir + '**/*');
}


// Task: Compile HTML
function compileHTML() {
  // Set "" for same server. But empty strings are falsy, so check "undefined".
  // If undefined, it's set to null without quotes to let zetaHelper set the URL.
  let quoted_url = null;  // null, prevents additional quoting on "npm run start" reloads
  if (typeof soffice_base_url !== "undefined") quoted_url = "'" + soffice_base_url + "'";

  return gulp.src(['index.html'])
    .pipe( inject.replace("'<!-- soffice.js Base -->'", quoted_url) )
    .pipe(gulp.dest(distDir))
    .pipe(browserSync.stream());
}


// Task: Compile JS
function compileJS() {
  return gulp.src( './office_thread.js') //
    .pipe(beautify.js({ indent_size: 2, max_preserve_newlines: 2}))
    .pipe(gulp.dest(distDir))
    .pipe(browserSync.stream());
}


// Task: Copy Vendors
function copyVendors() {
  let stream = mergeStream();

  stream.add( gulp.src( 'node_modules/zetajs/source/zeta.js' ).pipe( gulp.dest( distDir + 'assets/vendor/zetajs/' ) ) );
  stream.add( gulp.src( 'node_modules/zetajs/source/zetaHelper.js' ).pipe( gulp.dest( distDir + 'assets/vendor/zetajs/' ) ) );

  return stream;
}


// Init live server browser sync
function initBrowserSync(done) {
  browserSync.init({
    server: {
      baseDir: distDir,
      middleware: function (req, res, next) {
        // required for WASM (SharedArray support)
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
        next();
      }
    },
    listen: custom_listen,  // host ip
    port: custom_port,
    notify: false,
    browser: custom_browser,
    open: !no_browser
  });
  done();
}


// Watch files
function watchFiles() {
  gulp.watch('*.html', compileHTML);
  gulp.watch('*.js', compileJS);
}


function setDebug(done) {
  soffice_base_url = '';
  done();
}


// Export tasks
const dist = gulp.series(clean, gulp.parallel(compileHTML, compileJS, copyVendors) );

exports.watch = gulp.series(dist, watchFiles);
exports.start = gulp.series(dist, gulp.parallel(watchFiles, initBrowserSync) );
exports.debug = gulp.series(setDebug, gulp.parallel(compileHTML, compileJS, copyVendors) );
exports.default = dist;

const fs = require('fs');
const gulpfile_optional = 'config.js';
if (fs.existsSync(gulpfile_optional)) {
  eval(fs.readFileSync(gulpfile_optional)+'');
}
