const fs = require('fs-extra');
const path = require('path');
const async = require('async');
const exec = require('child_process').exec;
const config = require('config');
const folderlisting = require('./folder-listing');

//private
var mediaRoot = config.get('mediaRoot');
var working = false;

//public
exports = module.exports = {

    IsWorking: function(working) {
        if (working) {
            working = working;
        }
        return working;
    },

    Begin: function (currentFolder, callback) {
        
        var that = this;
        var currentMediaFolder = path.join(mediaRoot, currentFolder);
        var previews = {};

        //get contents of folder to analyze
        fs.readdir(currentMediaFolder, (err, mediaItems) => {
            if (err) {
                return callback(err);
            }

            //for each item in folder
            async.eachSeries(mediaItems, (mediaItem, nextitem) => {

                //if begins with a dot, we pass (mac) or a @ (linux)
                if (mediaItem.charAt(0) === '.' || mediaItem.charAt(0) === '@') {
                    return nextitem();
                }

                //get stats for the source item (file or folder)
                fs.stat(path.join(currentMediaFolder, mediaItem), (err, stats) => {
                    if (err) {
                        return nextitem(err);
                    }

                    //if a folder, recurrsively proceed into it
                    if (stats.isDirectory()) {

                        var childFolder = path.join(currentFolder, mediaItem);

                        //go into directory
                        that.Begin(childFolder, err => {
                            if (err) {
                                return nextitem(err);
                            }

                            return nextitem();
                        });
                    }

                    else {

                        var sourceFile = path.join(currentMediaFolder, mediaItem);
                        var fileDetails = folderlisting.ConvertSourceFileNameToThumbFileName(mediaItem);

                        if (fileDetails.type == 'video') {

                            ConvertVideo(sourceFile, (err, newSourceFile) => {
                                if (err) {
                                    return nextitem(err);
                                }

                                nextitem();
                            });
                        }
                        else {
                            console.log('We dont convert this file type: ' + item);
                            return nextitem();
                        }
                    }
                });

            }, err => {
                if (err) {
                    return callback(err);
                }
                callback();
            });
        });
    }
};

//private methods


var ConvertVideo = function(sourceFile, callback) {

    //before converting, check to see if this video is already in a suitable format
    var details = path.parse(sourceFile);

    if (details.ext !== '.mp4') {

        var destinationMediaPath = path.join(details.root, details.dir, details.name + '.mp4');

        var command = 'HandBrakeCLI --input "' + sourceFile + '" --output "' + destinationMediaPath + '" ' + config.get('handbrakecli');

        console.log('Coverting video: ' + sourceFile + ' to ' + destinationMediaPath);

        exec(command, (err, stdout, stderr) => {
            if (err) {
                console.log(stderr);
                return callback(err);
            }

            console.log('Coverting video complete: ' + destinationFile);

            callback(destinationMediaPath);
        });
    } 
    else {
        callback(sourceFile);
    }
};