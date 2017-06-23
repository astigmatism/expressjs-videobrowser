const fs = require('fs-extra');
const watch = require('watch');
const path = require('path');
const async = require('async');
const thumbmaker = require('./thumb-maker');
const videoconversion = require('./video-conversion');
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
            interval: 10

        }, (f, cur, prev) => {

            Begin(mediaRoot);
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

var Begin = function() {

    if (!thumbmaker.working && !videoconversion.working) {
        
        console.log('Ensuring all videos are converted...');
        
        videoconversion.working = true;

        videoconversion.Begin('', (err, data) => {

            if (err) {
                console.log(err);
            }
            console.log('Video Conversion task complete.');
            
            videoconversion.working = false;

            //thumbs

            console.log('Thumb Maker task starting...');

            thumbmaker.working = true;

            thumbmaker.Begin('', false, (err, data) => {
                if (err) {
                    console.log(err);
                }
                console.log('Thumb Maker task complete.');
                
                thumbmaker.working = false;
            });
        });
    }
    else {
        console.log('Thumb Maker task or Video Conversion alreday working...');
    }
};
