const fs = require('fs-extra');
const watch = require('watch');
const path = require('path');
const async = require('async');
const thumbmaker = require('./thumb-maker');

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
        files: {},
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

                //if a file
                
                listing.files[item] = {
                    filename: path.basename(item, path.extname(item))
                };
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

module.exports = ApplicationControl;
