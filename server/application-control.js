const fs = require('fs-extra');
const watch = require('watch');
const path = require('path');
const async = require('async');
const thumbmaker = require('./thumb-maker');
const folderlisting = require('./folder-listing');
const config = require('config');

//private members
var thumbRoot = config.get('thumbRoot');
var mediaRoot = config.get('mediaRoot');
var previewFilename = config.get('previewFilename');

//public members/methods
exports = module.exports = {

    OnApplicationStart: function() {

        var that = this;

        watch.watchTree(mediaRoot, {

            ignoreDotFiles: true,
            interval: 5

        }, (f, cur, prev) => {

            MakeThumbnails(mediaRoot);
        });
    },

    ProcessLocation: function(location, callback) {

        folderlisting.GetFolderListing(location, (err, listing) => {
            if (err) {
                return callback(err);
            }

            listing.previews = [];

            var manifestPath = path.join(thumbRoot, location, previewFilename);

            folderlisting.GetPreviews(manifestPath, (err, data) => {

                if (data) {
                    listing.previews = data;
                }

                //add other details for the client here
                listing.framesPerAxis = config.get('framesPerAxis');

                //complete!
                callback(null, listing);

            });
        });
    }
};

//private

var MakeThumbnails = function() {

    if (!thumbmaker.IsWorking()) {
        
        console.log('Thumb Maker task starting...');

        thumbmaker.IsWorking(true);

        thumbmaker.Begin('', false, (err, data) => {
            if (err) {
                console.log(err);
            }
            console.log('Thumb Maker task complete.');
            
            thumbmaker.IsWorking(false);
        });
    }
    else {
        console.log('Thumb Maker task alreday working...');
    }
};
