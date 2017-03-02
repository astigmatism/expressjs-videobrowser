const fs = require('fs-extra');
const watch = require('watch');
const path = require('path');
const async = require('async');
const thumbmaker = require('./thumb-maker');
const config = require('config');

const thumbFolder = './public/thumbs';

ApplicationControl = function() {
};

ApplicationControl.onApplicationStart = function(sourcePath) {

    var that = this;

    watch.watchTree(sourcePath, {

        ignoreDotFiles: true,
        interval: 5

    }, (f, cur, prev) => {

        that.autoCapture(sourcePath);
    });

    //kick off autoCapture once on start
    //that.autoCapture(sourcePath);
};

ApplicationControl.autoCapture = function(sourcePath) {

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

ApplicationControl.getDirectoryListing = function(folder, callback) {

    var sourcePath = path.join(thumbFolder, folder);
    var listing = {
        location: folder,
        videos: {},
        images: {},
        folders: {}
    };

    //get contents of folder to analyze
    fs.readdir(sourcePath, function(err, items) {
        if (err) {
            return callback(err);
        }
        
        //for each item in folder
        async.eachSeries(items, (item, nextitem) => {

            //if begins with a dot, we pass
            if (item.charAt(0) === '.') {
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

                if (ext === '.png') {
                    append = listing.images;
                }

                else if (ext === '.mp4') {
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
};

ApplicationControl.getImagePath = function(partial) {

    partial = partial.replace(/\.(png|mp4)$/, '');

    return path.join(config.get('source'), partial);
};

module.exports = ApplicationControl;
