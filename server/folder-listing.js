const fs = require('fs-extra');
const path = require('path');
const async = require('async');
var thumbmaker = require('./thumb-maker');
const config = require('config');

//private members
var thumbRoot = config.get('thumbRoot');
var mediaRoot = config.get('mediaRoot');
var webThumbRoot = config.get('webThumbRoot');
var webMediaRoot = config.get('webMediaRoot');

//public members/methods
exports = module.exports = {

    GetFolderListing: function(folder, callback) {

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
                    thumbFileName: thumbDetails.name,
                    ext: thumbDetails.ext
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

                        var imageRegex = new RegExp('^(' + config.get('images.prefix') + ').*$');
                        var videoRegex = new RegExp('^(' + config.get('videos.prefix') + ').*$');

                        details.filename = exports.ConvertThumbFileNameToSourceFileName(item);
                        details.media = path.join(webMediaFolder, details.filename);

                        //is an image
                        if (imageRegex.test(details.thumbFileName)) {
                            listing.images[item] = details;
                        }

                        //is a video
                        else if (videoRegex.test(details.thumbFileName)) {
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
    },

    ConvertThumbFileNameToSourceFileName: function(filename) {

        var result = path.basename(filename, path.extname(filename)); //remove extra image extension from thumb

        var imageRegex = new RegExp('^(' + config.get('images.prefix') + ').*$');
        var videoRegex = new RegExp('^(' + config.get('videos.prefix') + ').*$');

        //is an image
        if (imageRegex.test(result)) {
            result = result.replace(config.get('images.prefix'), '');
        }

        //is a video
        else if (videoRegex.test(result)) {
            result = result.replace(config.get('videos.prefix'), '');
        }

        return result;
    },

    ConvertSourceFileNameToThumbFileName: function(filename) {

        var isImage = new RegExp(config.get('patterns.image'), 'i').test(filename);
        var isVideo = new RegExp(config.get('patterns.video'), 'i').test(filename);
        var isAvoid = new RegExp(config.get('patterns.avoid'), 'i').test(filename);
        
        var result = {
            thumb: '',
            type: ''
        };

        //destination thumb name can differ depending on how we might detect it browsing
        
        if (isImage) {
            result.type = 'image';
            result.thumb = config.get('images.prefix') + path.basename(filename) + '.' + config.get('images.ext');
        } else if (isVideo) {
            result.type = 'video';
            result.thumb = config.get('videos.prefix') + path.basename(filename) + '.' + config.get('videos.ext');
        }

        return result;
    },

    GetPreviews: function(manifestPath, callback) {

        //if previews exist
        fs.exists(manifestPath, (exists) => {

            if (exists) {

                fs.readJson(manifestPath, (err, data) => {
                    if (err) {
                        //on error, simply barf out but continue
                        console.log('GetPreviews failed:', err);
                        return callback();
                    }

                    if (Object.keys(data).length > 0) {
                        
                        return callback(null, data);
                    } 
                    else {
                        return callback();
                    }
                });
            }
            else {
                callback();
            }

        });
    }
};
