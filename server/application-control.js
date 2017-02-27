var watch = require('watch');
var thumbmaker = require('./thumb-maker');

ApplicationControl = function() {
};

ApplicationControl.onApplicationStart = function(args) {

    var sourcePath = args[2];
    var that = this;

    watch.createMonitor(sourcePath, monitor => {

        monitor.on('created', (f, stat) => {
            that.autoCapture(sourcePath);
        });
        
        monitor.on('changed', (f, curr, prev) => {
            that.autoCapture(sourcePath);
        });
        
        monitor.on('removed', (f, stat) => {
            // Handle removed files
        });
    });

    //kick off autoCapture once on start
    that.autoCapture(sourcePath);
};

ApplicationControl.autoCapture = function(sourcePath) {

    if (!thumbmaker.working) {
        
        console.log('Thumb Maker task starting...');
        thumbmaker.working = true;

        thumbmaker.start(sourcePath, '', './public/thumbs', false, (err, data) => {
            if (err) {
                console.log(err);
            }
            thumbmaker.working = false;
        });
    }
    else {
        console.log('Thumb Maker task alreday working...');
    }
};

module.exports = ApplicationControl;
