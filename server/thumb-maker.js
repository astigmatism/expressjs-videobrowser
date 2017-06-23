const fs = require('fs-extra');
const path = require('path');
const async = require('async');
const exec = require('child_process').exec;
const config = require('config');
const gm = require('gm');
const folderlisting = require('./folder-listing');

//private
var thumbRoot = config.get('thumbRoot');
var mediaRoot = config.get('mediaRoot');
var previewFilename = config.get('previewFilename');
var framesPerAxis = parseInt(config.get('framesPerAxis'), 10); //grid will be this value * 2

//public
exports = module.exports = {

    working: false,

    Begin: function (currentFolder, override, callback) {
        
        var that = this;
        var currentMediaFolder = path.join(mediaRoot, currentFolder);
        var currentThumbFolder = path.join(thumbRoot, currentFolder);
        var previews = {};

        //get contents of folder to analyze
        fs.readdir(currentMediaFolder, (err, mediaItems) => {
            if (err) {
                return callback(err);
            }

            //ensure a thumbnail destination exists with the same name
            fs.ensureDir(currentThumbFolder, err => {
                if (err) {
                    return callback(err);
                }

                //if any files already in the destination do not have files in the source, we'll clean them up (deleted)
                cleanUp(currentMediaFolder, currentThumbFolder, err => {

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
                                that.Begin(childFolder, override, err => {
                                    if (err) {
                                        return nextitem(err);
                                    }

                                    //after doing folder, get all previews for it to write to current location when complete
                                    FindPreviewImages(childFolder, function(err, folderPreviews) {
                                        if (err) {
                                            return callback(err);
                                        }

                                        previews[mediaItem] = folderPreviews;

                                        return nextitem();
                                    });
                                });
                            }

                            else {

                                var sourceFile = path.join(currentMediaFolder, mediaItem);

                                var fileDetails = folderlisting.ConvertSourceFileNameToThumbFileName(mediaItem);
                                
                                var destinationFile = path.join(currentThumbFolder, fileDetails.thumb);

                                //if destination file exists, do we need to override it?
                                handleDestination(destinationFile, override, (err, perform) => {
                                    if (err) {
                                        return nextitem(err);
                                    }

                                    //file keys
                                    // for (key in FileKeys) {

                                    // }



                                    if (perform) {

                                        console.log('------------------------------ ' + fileDetails.type + ' ------------------------------');
                                        console.log('Source: ' + sourceFile);
                                        console.log('Destination: ' + destinationFile);

                                        //ok, what type of conversion is this?

                                        if (fileDetails.type == 'video') {

                                            //handbrake
                                            // convertVideo(sourceFile, destinationFile, err => {
                                            //     if (err) {
                                            //         console.log(err);
                                            //     }
                                            //     return nextitem();
                                            // });

                                            //ffmpeg
                                            GetAspectRatio(sourceFile, (err, width, height) => {
                                                if (err) {
                                                    return callback(err);
                                                }

                                                var aspectRatio = height / width;

                                                GetFrameCount(sourceFile, (err, frameCount) => {

                                                    //with frame count known, we can extract exactly the number of frames to fit our grid
                                                    var captureEvery = Math.round(frameCount / (framesPerAxis * framesPerAxis));

                                                    CaptureFrames(sourceFile, destinationFile, captureEvery, aspectRatio, err => {
                                                        if (err) {
                                                            return callback(err);
                                                        }
                                                        nextitem();
                                                    });

                                                });
                                            });
                                        }
                                        else if (fileDetails.type == 'image') {

                                            gm(sourceFile).resize(320).setFormat(config.get('images.ext')).quality(100).write(destinationFile, err => {
                                                if (err) {
                                                    console.log(err);
                                                }
                                                return nextitem();
                                            });
                                        }

                                        else {
                                            console.log('We dont know what to do with this file type: ' + item);
                                            return nextitem();
                                        }
                                    }
                                    else {
                                        console.log('Already complete: ' + sourceFile);
                                        return nextitem();
                                    }
                                });
                            }
                        });

                    }, err => {
                        if (err) {
                            return callback(err);
                        }

                        //write manifest file here
                        fs.outputJson(path.join(currentThumbFolder, previewFilename), previews, err => {
                            if (err) {
                                return callback(err);
                            }
                            callback();
                        });
                    });
                });
            });
        });
    }
};

//private methods

var FindPreviewImages = function(directory, callback) {

    //immediate and child results 
    // I do this because in the folder preview I want to show immediate (files in this folder) stuff as a priority
    var previews = {
        immediate: [],
        children: []
    }

    folderlisting.GetFolderListing(directory, (err, listing) => {
        if (err) {
            return callback(err);
        }

        //we want to feature the images and videos from this folder first, so check its contents before heading into its child folders

        //randomize each, yes even folders which we'll search for more previews
        var imageKeys = Object.keys(listing.images);
        var videoKeys = Object.keys(listing.videos);
        var folderKeys = Object.keys(listing.folders);

        //image previews
        for (var i = 0, len = imageKeys.length; i < len; ++i) {
            previews.immediate.push({
                type: 'image',
                data: listing.images[imageKeys[i]]
            })
        }

        //video previews?
        for (var i = 0, len = videoKeys.length; i < len; ++i) {
            previews.immediate.push({
                type: 'video',
                data: listing.videos[videoKeys[i]]
            });
        }

        //child folders
        if (folderKeys.length > 0) {

            //we'll combine all child results and return them
            var childPreviews = [];

            async.eachSeries(folderKeys, (folderKey, nextitem) => {

                var childFolder = path.join(directory, folderKey);

                FindPreviewImages(childFolder, (err, folderpreviews) => {

                    //the children previews are its immeidate, and the children's children
                    childPreviews = childPreviews.concat(folderpreviews.immediate);
                    childPreviews = childPreviews.concat(folderpreviews.children);
                    return nextitem();
                });

            }, err => {
                if (err) {
                    return callback(err);
                }

                previews.children = childPreviews;
                return callback(null, previews);
            });
        }
        else {
            return callback(null, previews);
        }
    });
};

var convertVideo = function(sourceFile, destinationFile, callback) {

    var command = 'HandBrakeCLI --input "' + sourceFile + '" --output "' + destinationFile + '" --encoder x264 --vb 1800 --ab 0 --maxWidth 320 --maxHeight 240 --two-pass --optimize';

    console.log('Coverting video: ' + sourceFile);

    exec(command, (err, stdout, stderr) => {
        if (err) {
            console.log(stderr);
            return callback(err);
        }

        console.log('Coverting video complete: ' + destinationFile);

        callback();
    });
};

var GetAspectRatio = function(sourceFile, callback) {

    var commandWidth = 'ffprobe -v error -of flat=s=_ -select_streams v:0 -show_entries stream=width "' + sourceFile + '"';
    var commandHeight = 'ffprobe -v error -of flat=s=_ -select_streams v:0 -show_entries stream=height "' + sourceFile + '"';
    var width = 0;
    var height = 0;

    //console.log('Aspect Ratio command: ' + commandWidth);
    console.log('Getting aspect ratio...');

    exec(commandWidth, (err, stdout, stderr) => {
        if (err) {
            console.log(stderr);
            return callback(err);
        }

        var match = stdout.match(/=(\d*)/);

        if (match.length < 2) {
            return callback(stdout);
        }
        width = match[1];

        exec(commandHeight, (err, stdout, stderr) => {
            if (err) {
                console.log(stderr);
                return callback(err);
            }

            height = stdout.match(/=(\d*)/)[1];

            console.log('Aspect Ratio result: ' + width + 'x' + height);

            return callback(null, width, height);
        });
    });
};

var GetFrameCount = function(sourceFile, callback) {

    var command = 'ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of default=nokey=1:noprint_wrappers=1 "' + sourceFile + '"';
    var frameCount = 0;

    //console.log('Frame count command: ' + command);
    console.log('Getting frame count...');

    exec(command, (err, stdout, stderr) => {
        if (err) {
            console.log(stderr);
            return callback(err);
        }               
        //stdout is exactly frame count
        frameCount = parseInt(stdout, 10);
        
        console.log('Frame Count result: ' + frameCount);

        callback(null, frameCount);
    });
}

var CaptureFrames = function(sourceFile, destinationFile, captureEvery, aspectRatio, callback) {

    var thumbWidth = config.get('videoThumbSize.width');
    var thumbHeight = thumbWidth * aspectRatio;

    var command = 'ffmpeg -i "' + sourceFile + '" -frames 1 -vf "select=not(mod(n\\,' + captureEvery + ')),scale=' + thumbWidth + ':' + thumbHeight + ',tile=' + framesPerAxis + 'x' + framesPerAxis + '" "' + path.join(destinationFile) + '"';
    
    //console.log('Capture command: ' + command);
    console.log('Capturing every ' + captureEvery + ' frames...');

    exec(command, (err, stdout, stderr) => {
        if (err) {
            console.log(stderr);
            return callback(err);
        }
        
        callback();
    });
};

var handleDestination = function(file, override, callback) {

    fs.exists(file, exists => {

        if (exists) {

            //if exists and override, delete file and return true
            if (override) {

                fs.unlink(file, err => {
                    if (err) {
                        return callback(err);
                    }
                    return callback(null, true);
                });
            } 

            //if exists and we don't override, no work needed return false
            else {
                return callback(null, false);
            }

        }

        //doesn't exist, return true
        else {
            return callback(null, true);
        }
    });
};

var cleanUp = function(sourceFolder, destinationPath, callback) {

    //get contents of folder to analyze
    fs.readdir(destinationPath, (err, items) => {
        if (err) {
            return callback(err);
        }

        //for each item in folder
        async.eachSeries(items, (item, nextitem) => {

            //if begins with a dot, we pass
            if (item.charAt(0) === '.') {
                return nextitem();
            }

            var destinationItem = path.join(destinationPath, item); //file or folder

            //get stats for the source item (file or folder)
            fs.stat(destinationItem, (err, stats) => {
                if (err) {
                    return nextitem(err);
                }

                var sourceItem = path.join(sourceFolder, item); //start by taking the name without modification

                //if a file, need to change filename to match source (folder names are the same in both)
                if (!stats.isDirectory()) {

                    //sanitize the thumb name to match the source name
                    var sourceFileName = folderlisting.ConvertThumbFileNameToSourceFileName(item);
                    sourceItem = path.join(sourceFolder, sourceFileName);
                }

                fs.exists(sourceItem, exists => {

                    if (!exists) {
                        
                        //if a source file does not exist, we no longer need the resulting file in the destination folder
                        console.log('File or folder does not exist in source, removing: ' + destinationItem);

                        fs.remove(destinationItem, err => {
                            if (err) {
                                return callback(err);
                            }
                            nextitem();
                        });
                    }
                    else {
                        nextitem();
                    }
                });
            });

        }, err => {
            if (err) {
                return callback(err);
            }
            callback(); //complete!
        });
    });
};
