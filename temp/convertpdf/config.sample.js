//// IMPORTANT - Usage:
//// COPY THIS FILE to config.js to use it.
////
//// gulpfile.js will automatically include config.js if it exists.




//////// SIMPLE OPTIONS

// Serve the LOWA files from a custom URL.
// E.g. for testing on localhost / 127.0.0.1.
//
// When serving the LOWA files from foreign origins, these HTTP headers are needed:
//   Cross-Origin-Resource-Policy: cross-origin
//   Access-Control-Allow-Origin: *
//   Access-Control-Allow-Methods: *
//
// '' will assume the LOWA files in the same directory as the web app.
// IMPORTANT: Place soffice.{data,data.js.metadata,js,wasm} in the public/ folder.
// Use with "npm run debug". (other tasks may clean the public/ folder)
soffice_base_url = '';
// current limitations:
// - Relative URLs may not work. Use absolute URLs instead!
//   - For example: http://127.0.0.1:8080/lowa_build_subdir/
// - Also always append the trailing slash!

// Disable cleaning the public folder for all tasks.
clean_disabled = true;

// Custom webserver port.
//custom_port = "8080";

// Which web browser to start with "npm run start".
//custom_browser = "chromium";




//////// ADVANCED OPTIONS

//// You may modify the debug target.
// exports.debug = gulp.series(gulp.parallel(compileHTML, compileJS, copyVendors));

//// Pick a custom browser and launch it automatically.
//custom_browser = "chromium";  // ["google chrome", "firefox"]
//exports.debug = gulp.series(gulp.parallel(compileHTML, compileJS, copyVendors),
//    gulp.parallel(watchFiles, initBrowserSync) );
