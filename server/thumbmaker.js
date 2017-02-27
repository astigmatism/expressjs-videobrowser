const fs = require('fs-extra');
const path = require('path');
const async = require('async');
const exec = require('child_process').exec;

ThumbMaker = function() {
};

ThumbMaker.working = false;

ThumbMaker.start = function (sourceRoot, currentPath, destinationPath, override, callback) {

    var that = this;

    var sourceFolder = path.join(sourceRoot, currentPath);

    //get contents of folder to analyze
    fs.readdir(sourceFolder, function(err, items) {
        if (err) {
            return callback(err);
        }

        //that.syncfolders()

        //ensure a thumbnail destination exists with the same name
        fs.ensureDir(destinationPath, err => {
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
                fs.stat(path.join(sourceFolder, item), (err, stats) => {
                    if (err) {
                        return nextitem(err);
                    }

                    //if a folder, recurrsively proceed into it
                    if (stats.isDirectory()) {

                        //define the destination Path

                        that.start(sourceRoot, path.join(currentPath, item), path.join(destinationPath, '.' + item), override, callback);
                        return nextitem();
                    }

                    //if a file, attempt a conversion

                    var destinationFolder = path.join(destinationPath, item);
                    var sourceFile = path.join(sourceFolder, item);

                    //if destination folder exists, do we need to override it?
                    that.handleDestination(destinationFolder, override, (err, perform) => {
                        if (err) {
                            return nextitem(err);
                        }

                        if (perform) {

                            console.log('Working: ' + sourceFile);

                            var frameCountCommand = 'ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of default=nokey=1:noprint_wrappers=1 "' + sourceFile + '"';
                            var frameCount = 0;

                            exec(frameCountCommand, (err, stdout, stderr) => {
                                
                                //stdout is exactly frame count
                                frameCount = parseInt(stdout, 10);
                            
                            }).on('close', code => {
                                
                                console.log(sourceFile + ' frame count: ' + frameCount);

                                //with frame count, we can extract exactly 100 frames
                                var captureEvery = Math.round(frameCount / 100);

                                //var command = 'ffmpeg -i "' + sourceFile + '" -vf fps=1/5 "' + path.join(destinationFolder, '%d.png') + '"';
                                var captureCommand = 'ffmpeg -i "' + sourceFile + '" -frames 1 -vf "select=not(mod(n\\,' + captureEvery + ')),scale=320:240,tile=10x10" "' + path.join(destinationFolder, 'out.png') + '"';
                                
                                console.log(captureCommand);

                                exec(captureCommand, (err, stdout, stderr) => {
                                    if (err) {
                                        console.log(err);
                                    }
                                    console.log(stdout);
                                })
                                .on('close', function(code) {

                                    console.log('Finished ffmpeg with code ' + code);
                                    

                                    //TODO: next, change size of thumbnails
                                    
                                    nextitem();
                                });
                            });
                        }
                        else {
                            console.log('Already complete: ' + sourceFile);
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
    });
};

ThumbMaker.handleDestination = function(folder, override, callback) {

    fs.exists(folder, exists => {

        if (exists) {

            //if exists and override work, clear dir and return true
            if (override) {
                fs.emptyDir(folder, err => {
                    if (err) {
                        return callback(err);
                    }
                    console.log('Exists and Override: ' + folder);
                    return callback(null, true);
                });
            } 

            //if exists and we don't override, ensure there are items in the folder
            else {

                fs.readdir(folder, (err, items) => {
                    if (err) {
                        return callback(err);
                    }

                    //if contents, we don't need to perform work
                    if (items.length > 0) {
                        console.log('Exists and NO Override and items found: ' + folder);
                        return callback(null, false);
                    }

                    //if no contents, let's perform the work
                    else {
                        console.log('Exists and NO Override and NO items found: ' + folder);
                        return callback(null, true);
                    }
                });
            }

        }

        //doesn't exist, create and perform work
        else {
            fs.ensureDir(folder, err => {
                if (err) {
                    return callback(err);
                }
                console.log('Does not exist: ' + folder);
                return callback(null, true)
            });
        }
    });
};

module.exports = ThumbMaker;
