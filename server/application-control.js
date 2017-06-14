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

    ProcessLocation: function(location, callback) {

        GetFolderListing(location, (err, listing) => {
            if (err) {
                return callback(err);
            }

            //find previews for folders
            var folderKeys = Object.keys(listing.folders);
            async.eachSeries(folderKeys, (folder, nextfolder) => {

                FindPreviewImages(path.join(location, folder), function(err, previews) {
                    
                    //add preview data to listing
                    listing.folders[folder].preview = previews;
                    return nextfolder();
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

var GetFolderListing = function(folder, callback) {

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

            //default set of data to include
            var details = {
                thumb: path.join(webThumbFolder, item),
                filename: thumbDetails.name,
                ext: thumbDetails.ext,
                media: path.join(webMediaFolder, thumbDetails.name)
            };

            //get stats for the source item (file or folder)
            fs.stat(thumbPath, (err, stats) => {
                if (err) {
                    return nextitem(err);
                }

                //if a folder
                if (stats.isDirectory()) {
                    listing.folders[item] = details;
                }

                //is a file
                else {

                    //is an image
                    if (details.ext === '.' + config.get('images.ext')) {
                        listing.images[item] = details;
                    }

                    //is a video
                    else if (details.ext === '.' + config.get('videos.ext')) {
                        listing.videos[item] = details;
                    }
                }
                return nextitem();
            });

        }, err => {
            if (err) {
                return callback(err);
            }
            callback(null, listing); //complete!
        });
    });
};

var FindPreviewImages = function(directory, callback) {

    var previews = [];

    GetFolderListing(directory, (err, listing) => {

        //we want to feature the images and videos from this folder first, so check its contents before heading into its child folders

        //randomize each, yes even folders which we'll search for more previews
        var imageKeys = shuffle(Object.keys(listing.images));
        var videoKeys = shuffle(Object.keys(listing.videos));
        var folderKeys = shuffle(Object.keys(listing.folders));

        //image previews
        for (var i = 0, len = imageKeys.length; i < len && i < numberOfImagePreviewsForFolder; ++i) {
            previews.push(listing.images[imageKeys[i]]);
        }

        //video previews?

        //child folders: so we only want to start looking in child folders if we dont have enough previews.
        if (folderKeys.length > 0 && previews.length < numberOfImagePreviewsForFolder) {

            //we'll combine all child results and return them
            var childPreviews = [];

            async.eachSeries(folderKeys, (folderKey, nextitem) => {

                var childFolder = path.join(directory, folderKey);
                
                FindPreviewImages(childFolder, (err, folderpreviews) => {

                    for (var i = 0, len = folderpreviews.length; i < len && previews.length < numberOfImagePreviewsForFolder; ++i) {
                        previews.push(folderpreviews[i]);
                    }

                    //if full, leave
                    if (previews.length > numberOfImagePreviewsForFolder) {
                        return callback(null, previews);
                    }
                    //otherwise keep building in sibling folders
                    else {
                        return nextitem();
                    }
                });

            }, err => {
                if (err) {
                    return callback(err);
                }
                //previews = previews.slice(0, numberOfImagePreviewsForFolder);
                return callback(null, previews);
            });
        }
        else {
            return callback(null, previews);
        }
    });
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
