const fs = require('fs-extra');
const path = require('path');
const async = require('async');
const exec = require('child_process').exec;
const config = require('config');
const gm = require('gm');

//private
var thumbFolder = config.get('thumbRoot');

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

                            //if a file, attempt a conversion, first detect which type
                            
                            var isImage = new RegExp(config.get('patterns.image'), 'i').test(item);
                            var isVideo = new RegExp(config.get('patterns.video'), 'i').test(item);
                            var isAvoid = new RegExp(config.get('patterns.avoid'), 'i').test(item);
                            
                            var sourceFile = path.join(sourceFolder, item);
                            var destinationFileName = path.basename(item) + (isImage ? '.' + config.get('images.ext') : (isVideo ? '.' + config.get('videos.ext') : ''));
                            var destinationFile = path.join(destinationPath, destinationFileName);

                            //if destination file exists, do we need to override it?
                            handleDestination(destinationFile, override, (err, perform) => {
                                if (err) {
                                    return nextitem(err);
                                }

                                if (perform) {

                                    console.log('------------------------------ ' + (isImage ? 'image' : (isVideo ? 'video' : '')) + ' ------------------------------');
                                    console.log('Source: ' + sourceFile);
                                    console.log('Destination: ' + destinationFile);

                                    //ok, what type of conversion is this?

                                    if (isVideo) {

                                        convertVideo(sourceFile, destinationFile, err => {
                                            if (err) {
                                                console.log(err);
                                            }
                                            return nextitem();
                                        });
                                    }
                                    else if (isImage) {

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

var getAspectRatio = function(sourceFile, callback) {

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

var getFrameCount = function(sourceFile, callback) {

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

var captureFrames = function(sourceFile, destinationFile, captureEvery, aspectRatio, callback) {

    var thumbWidth = config.get('thumbSize.width');
    var thumbHeight = thumbWidth * aspectRatio;

    var command = 'ffmpeg -i "' + sourceFile + '" -frames 1 -vf "select=not(mod(n\\,' + captureEvery + ')),scale=' + thumbWidth + ':' + thumbHeight + ',tile=' + config.get('tiles.x') + 'x' + config.get('tiles.y') + '" "' + path.join(destinationFile) + '"';
    
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

                //if a file
                var sourceItem = path.join(sourceFolder, path.basename(item, path.extname(item))); //remove's the .png to reveal the source file name

                //if a folder
                if (stats.isDirectory()) {

                    sourceItem = path.join(sourceFolder, item);
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
