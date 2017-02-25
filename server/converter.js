const fs = require('fs-extra');
const path = require('path');
const async = require('async');
const exec = require('child_process').exec;

Converter = function() {
};

Converter.working = false;

Converter.start = function (folder, override, callback) {

    var that = this;

    //get contents of folder
    fs.readdir(folder, function(err, items) {
        if (err) {
            return callback(err);
        }

        //ensure a thumbnail destination exists
        fs.ensureDir(path.join(folder, '.thumbnails'), err => {
            if (err) {
                return callback(err);
            }

            //for each item in folder
            async.eachSeries(items, (item, nextitem) => {

                //if begins with a dot, we pass
                if (item.charAt(0) === '.') {
                    return nextitem();
                }
                
                //create paths specific to this file, both relative for nodejs and absolute for the external process
                var relativeSource = path.join(folder, item);
                var absoluteSource = path.join(__dirname + '/../', folder, item);
                var relativeDestination = path.join(folder, '.thumbnails', item);
                var absoluteDestination = path.join(__dirname + '/../', relativeDestination);

                //get stats for this item (file or folder)
                fs.stat(relativeSource, (err, stats) => {
                    if (err) {
                        return nextitem(err);
                    }

                    //if a folder, run function with it and bail
                    if (stats.isDirectory()) {
                        that.start(relativeSource, override, callback);
                        return nextitem();
                    }

                    //as a file, attempt to convert!!!
                    console.log('Checking: ' + relativeSource);

                    //if destination folder exists, do we need to override it?
                    that.handleDestination(relativeDestination, override, (err, perform) => {
                        if (err) {
                            return nextitem(err);
                        }

                        if (perform) {

                            console.log('Working: ' + relativeSource);

                            var command = 'ffmpeg -i "' + absoluteSource + '" -vf fps=1/5 "' + path.join(absoluteDestination, '%d.png') + '"';
                            
                            exec(command, (err, stdout, stderr) => {
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
                        }
                        else {
                            console.log('Already complete: ' + relativeSource);
                            nextitem();
                        }

                    });
                });

            }, function(err) {
                if (err) {
                    return callback(err);
                }
                callback(); //complete!
            });
        });
    });
};

Converter.handleDestination = function(folder, override, callback) {

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

module.exports = Converter;
