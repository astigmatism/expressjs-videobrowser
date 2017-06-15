const fs = require('fs-extra');
const path = require('path');
const async = require('async');
const exec = require('child_process').exec;
const config = require('config');
const gm = require('gm');

//private
var thumbFolder = config.get('thumbRoot');
var numberofFramesPerAxis = parseInt(config.get('numberofFramesPerAxis'), 10); //grid will be this value * 2

//public
exports = module.exports = {

    working: false,

    start: function (sourceRoot, currentPath, destinationPath, override, callback) {

        var that = this;
        var sourceFolder = path.join(sourceRoot, currentPath);

        //get contents of folder to analyze
        fs.readdir(sourceFolder, (err, items) => {
            if (err) {
                return callback(err);
            }

            //ensure a thumbnail destination exists with the same name
            fs.ensureDir(destinationPath, err => {
                if (err) {
                    return callback(err);
                }

                //if any files already in the destination do not have files in the source, we'll clean them up (deleted)
                cleanUp(sourceFolder, destinationPath, err => {

                    //for each item in folder
                    async.eachSeries(items, (item, nextitem) => {

                        //if begins with a dot, we pass (mac) or a @ (linux)
                        if (item.charAt(0) === '.' || item.charAt(0) === '@') {
                            return nextitem();
                        }

                        //get stats for the source item (file or folder)
                        fs.stat(path.join(sourceFolder, item), (err, stats) => {
                            if (err) {
                                return nextitem(err);
                            }

                            //if a folder, recurrsively proceed into it
                            if (stats.isDirectory()) {

                                //define the destination Path

                                that.start(sourceRoot, path.join(currentPath, item), path.join(destinationPath, item), override, err => {
                                    if (err) {
                                        return nextitem(err);
                                    }
                                    return nextitem();
                                });
                                return;
                            }

                            var sourceFile = path.join(sourceFolder, item);

                            var fileDetails = exports.ConvertSourceFileNameToThumbFileName(item);
                            
                            var destinationFile = path.join(destinationPath, fileDetails.thumb);

                            //if destination file exists, do we need to override it?
                            handleDestination(destinationFile, override, (err, perform) => {
                                if (err) {
                                    return nextitem(err);
                                }

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
                                                var captureEvery = Math.round(frameCount / (numberofFramesPerAxis * numberofFramesPerAxis));

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
                        });

                    }, err => {
                        if (err) {
                            return callback(err);
                        }
                        callback(); //complete!
                    });
                });
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
    }
};

//private methods

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

    var command = 'ffmpeg -i "' + sourceFile + '" -frames 1 -vf "select=not(mod(n\\,' + captureEvery + ')),scale=' + thumbWidth + ':' + thumbHeight + ',tile=' + numberofFramesPerAxis + 'x' + numberofFramesPerAxis + '" "' + path.join(destinationFile) + '"';
    
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
                    var sourceFileName = exports.ConvertThumbFileNameToSourceFileName(item);
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
