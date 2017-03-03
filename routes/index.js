const express = require('express');
const control = require('../server/application-control');
const config = require('config');
const router = express.Router();

//private

var imagePathRegEx = new RegExp('.*\.' + config.get('images.ext') + '$'); //catches .png files in path

router.get(imagePathRegEx, function(req, res, next) {

	var options = {
		//root: __dirname + '/public/',
		dotfiles: 'deny',
		headers: {
		'x-timestamp': Date.now(),
		'x-sent': true
		}
	};

	var path = decodeURIComponent(control.getImagePath(req.path));

	res.sendFile(path, options, err=> {
		if (err) {
			return next(err);
		}
	});
});

router.get('*', function(req, res, next) {

	var path = req.params[0] == '/' ? '' : req.params[0]; //strip out the empty /

	control.getDirectoryListing(path, (err, contents) => {
		
		res.render('index', { 
			clientdata: contents
		});
	});
});

module.exports = router;
