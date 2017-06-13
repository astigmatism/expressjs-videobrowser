const fs = require('fs-extra');
const watch = require('watch');
const path = require('path');
const async = require('async');
const thumbmaker = require('./thumb-maker');
const config = require('config');

//private members
var thumbRoot = config.get('thumbRoot');
var mediaRoot = config.get('mediaRoot');
var webThumbRoot = config.get('webThumbRoot');
var webMediaRoot = config.get('webMediaRoot');
var numberOfImagePreviewsForFolder = 4;

//public members/methods
exports = module.exports = {

    onApplicationStart: function(sourcePath) {

        var that = this;

        watch.watchTree(sourcePath, {

            ignoreDotFiles: true,
            interval: 5

        }, (f, cur, prev) => {

            autoCapture(sourcePath);
        });

        //kick off autoCapture once on start
        //that.autoCapture(sourcePath);
    },

    getDirectoryListing: function(folder, callback) {

        var thumbFolder = path.join(thumbRoot, folder);
        var mediaFolder = path.join(mediaRoot, folder);
        var webThumbFolder = path.join(webThumbRoot, folder);
        var webMediaFolder = path.join(webMediaRoot, folder);

        var listing = {
            location: folder,
            videos: {},
            images: {},
            folders: {}
        };

        //get contents of folder to analyze
        fs.readdir(thumbFolder, (err, items) => {
            if (err) {
                return callback(err);
            }
            
            //for each item in folder
            async.eachSeries(items, (item, nextitem) => {

                //if begins with a dot, we pass (mac) or (@) docker unbuntu
                if (item.charAt(0) === '.' || item.charAt(0) === '@') {
                    return nextitem();
                }

                //see https://nodejs.org/docs/latest/api/path.html#path_path_parse_path
                var thumbPath = path.join(thumbFolder, item);
                var thumbDetails = path.parse(thumbPath);

                //get stats for the source item (file or folder)
                fs.stat(thumbPath, (err, stats) => {
                    if (err) {
                        return nextitem(err);
                    }

                    //default set of data to return to client for use
                    var details = {
                        thumb: path.join(webThumbFolder, item),
                        filename: thumbDetails.name,
                        ext: thumbDetails.ext,
                        media: path.join(webMediaFolder, thumbDetails.name)
                    };

                    //if a folder
                    if (stats.isDirectory()) {

                        var dirListing = exports.getDirectoryListing(folder + '/' + item, (err, dirlisting) => {;
                            if (err) {
                                return nextitem(err);
                            }

                            var shuffled = shuffle(Object.keys(dirlisting.images));

                            details.preview = [];

                            for (var i = 0, len = shuffled.length; i < len && i < numberOfImagePreviewsForFolder; ++i)
                            {
                                details.preview.push(dirlisting.images[shuffled[i]]);
                            }

                            listing.folders[item] = details;
                            return nextitem();
                        });
                    }

                    //not a folder
                    else {

                        var append = null;

                        if (details.ext === '.' + config.get('images.ext')) {
                            append = listing.images;
                        }

                        else if (details.ext === '.' + config.get('videos.ext')) {
                            append = listing.videos;
                        }

                        //if the file isn't something we can match against, we don't show it
                        else {
                            return nextitem();
                        }

                        append[item] = details;
                        nextitem();
                    }
                });

            }, err => {
                if (err) {
                    return callback(err);
                }
                callback(null, listing); //complete!
            });

        });
    }
};

var autoCapture = function(sourcePath) {

    if (!thumbmaker.working) {
        
        console.log('Thumb Maker task starting...');
        thumbmaker.working = true;

        thumbmaker.start(sourcePath, '', thumbRoot, false, (err, data) => {
            if (err) {
                console.log(err);
            }
            console.log('Thumb Maker task complete.');
            thumbmaker.working = false;
        });
    }
    else {
        console.log('Thumb Maker task alreday working...');
    }
};

var shuffle = function(array) {
    var i = 0;
    var j = 0;
    var temp = null;

    for (i = array.length - 1; i > 0; i -= 1) {
        j = Math.floor(Math.random() * (i + 1));
        temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}
