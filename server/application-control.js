const fs = require('fs-extra');
const watch = require('watch');
const path = require('path');
const async = require('async');
const thumbmaker = require('./thumb-maker');
const config = require('config');

//private members
var thumbFolder = config.get('thumbFolder');

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

        var sourcePath = path.join(thumbFolder, folder);
        var listing = {
            location: folder,
            videos: {},
            images: {},
            folders: {}
        };

        //get contents of folder to analyze
        fs.readdir(sourcePath, (err, items) => {
            if (err) {
                return callback(err);
            }
            
            //for each item in folder
            async.eachSeries(items, (item, nextitem) => {

                //if begins with a dot, we pass (mac) or (@) docker unbuntu
                if (item.charAt(0) === '.' || item.charAt(0) === '@') {
                    return nextitem();
                }

                //get stats for the source item (file or folder)
                fs.stat(path.join(sourcePath, item), (err, stats) => {
                    if (err) {
                        return nextitem(err);
                    }

                    //if a folder, recurrsively proceed into it
                    if (stats.isDirectory()) {

                        listing.folders[item] = {};
                        return nextitem();
                    }

                    //what kind of file is this
                    var ext = path.extname(item);
                    var details = {
                        filename: path.basename(item, path.extname(item))
                    };
                    var append = null;

                    if (ext === '.' + config.get('images.ext')) {
                        append = listing.images;
                    }

                    else if (ext === '.' + config.get('videos.ext')) {
                        append = listing.videos;
                    }

                    else {
                        return nextitem();
                    }

                    append[item] = details;
                    nextitem();
                });

            }, err => {
                if (err) {
                    return callback(err);
                }
                callback(null, listing); //complete!
            });

        });
    },

    getMediaPath: function(partial) {

        var re = new RegExp('\.(' + config.get('images.ext') + '|' + config.get('videos.ext') + ')$');
        partial = partial.replace(re, '');

        return path.join(config.get('source'), partial);
    }
};

//private methods

var autoCapture = function(sourcePath) {

    if (!thumbmaker.working) {
        
        console.log('Thumb Maker task starting...');
        thumbmaker.working = true;

        thumbmaker.start(sourcePath, '', thumbFolder, false, (err, data) => {
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
