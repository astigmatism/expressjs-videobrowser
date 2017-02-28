var express = require('express');
var control = require('../server/application-control');
var router = express.Router();

// router.get('/', function(req, res, next) {

// 	control.getDirectoryListing('/', (err, contents) => {
		
// 		res.render('index', { 
// 			listing: contents
// 		});
// 	});
// });

router.get('*', function(req, res, next) {

	var path = req.params[0] == '/' ? '' : req.params[0]; //strip out the empty /

	control.getDirectoryListing(path, (err, contents) => {

		res.render('index', { 
			listing: JSON.stringify(contents)
		});
	});
});

module.exports = router;
