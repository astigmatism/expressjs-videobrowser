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
var numberOfImagePreviewsForFolder = 4;

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

            //for each folder in listing, retrieve the preview file
            async.eachOfSeries(listing.folders, (folderDetails, folder, nextfolder) => {

                var manifestPath = path.join(thumbRoot, location, folder, previewFilename);

                listing.folders[folder].preview = [];

                //add preview details
                fs.readJson(manifestPath, (err, data) => {
                    if (err) {
                        //its possible the file doesn't exist yet since its created on its way out from making thumbs.
                        return nextfolder();
                    }

                    if (data) {
                        
                        var previews = ShuffleArray(data.immidiate); //always take immidate previews

                        if (previews.length < numberOfImagePreviewsForFolder) {
                            previews = previews.concat(ShuffleArray(data.children))
                        }
                        
                        listing.folders[folder].preview = previews.slice(0, numberOfImagePreviewsForFolder); //reduce down to the number required
                    }
                    nextfolder();
                });

            }, err => {
                if (err) {
                    return callback(err);
                }

                //add other details for the client here
                listing.framesPerAxis = config.get('framesPerAxis');

                //complete!
                callback(null, listing); 
            });
        });
    },

    
};

//private

var MakeThumbnails = function() {

    if (!thumbmaker.IsWorking()) {
        
        console.log('Thumb Maker task starting...');

        thumbmaker.Begin('', false, (err, data) => {
            if (err) {
                console.log(err);
            }
            console.log('Thumb Maker task complete.');
        });
    }
    else {
        console.log('Thumb Maker task alreday working...');
    }
};

var ShuffleArray = function(array) {
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
