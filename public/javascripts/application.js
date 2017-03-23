var Application = (function() {

	$( document ).ready(function() {

		var tiles = clientdata.tiles;

		//back button
		$('#back').on('click touch', function () {
			window.history.back();
		});

		//folders
		for (folder in clientdata.folders) {

			(function(folder, clientdata) {

				var li = $('<li class="folder"></li>');

				var caption = $('<div class="caption">' + folder + '</div>');
				li.append(caption);

				li.on('click touch', function () {
					window.location = clientdata.location + '/' + folder;
				});

				$('#listing').append(li);

			})(folder, clientdata);
		}

		var iteration = 0;

		//images
		for (file in clientdata.images) {

			(function(file, clientdata, iteration) {

				var data = clientdata.images[file];

				//dom
				var li = $('<li class="image"></li>');
				$('#listing').append(li);
				var image = $('<img src="/thumbs' + clientdata.location + '/' + file + '" />');
				li.append(image);
				var clickOverlay = $('<div class="click-overlay" />');
				li.append(clickOverlay);

				clickOverlay.click(function(event) {
						
					var offset = $(this).offset();
					var percentageOfWidth = Math.round(((event.pageX - offset.left) / li.width()) * 100);


					if (percentageOfWidth < 25) {
					}
					else if (percentageOfWidth > 75) {	
					}
					else {
						window.open(clientdata.location + '/' + file);
					}
				});

			})(file, clientdata, iteration++);
		};

		//videos
		for (file in clientdata.videos) {

			(function(file, clientdata, iteration) {

				var data = clientdata.images[file];
				var li = $('<li class="video"></li>');
				$('#listing').append(li);
				var caption = $('<div class="caption">' + file + '</div>');
				li.append(caption);
				var videowrapper = $('<div class="videowrapper" />');
				li.append(videowrapper);

				var video = $('<video />', {
				    id: 'video',
				    src: '/thumbs' + clientdata.location + '/' + file,
				    type: 'video/mp4',
				    controls: false,
				    autoplay: false,
				    preload: true
				});
				videowrapper.append(video);

				var scrubber = $('<div class="scrubber" />');
				videowrapper.append(scrubber);
				var marker = $('<div class="marker" />');
				scrubber.append(marker);

				video.on('loadedmetadata', function() {
					this.currentTime = getRandomInt(1, this.duration);
				});

				video.on('timeupdate', function() {
					var perc = this.currentTime / this.duration;
					marker.css('left',  (video.width() * perc) + 'px');
				});

				var clickOverlay = $('<div class="click-overlay" />');
				videowrapper.append(clickOverlay);

				clickOverlay.click(function(event) {
						
					var offset = $(this).offset();
					var percentageOfWidth = Math.round(((event.pageX - offset.left) / li.width()) * 100);

					if (percentageOfWidth < 25) {

						//back 5 seconds
						video[0].currentTime = (video[0].currentTime - 5) > 0 ? video[0].currentTime - 5 : video[0].currentTime;
						video[0].play();
					}
					else if (percentageOfWidth > 75) {	
					
						//back 5 seconds
						video[0].currentTime = (video[0].currentTime + 5) < video[0].duration ? video[0].currentTime + 5 : video[0].currentTime;
						video[0].play();
					}
					else {
						window.open(clientdata.location + '/' + file);
					}
				});

				scrubber.mousemove(function(event) {

					if (video[0].paused) {

						var offset = $(this).offset();
						var percentageOfWidth = Math.round(((event.pageX - offset.left) / $(this).width()) * 100);
						
						video[0].currentTime = (percentageOfWidth * .01) * video[0].duration;
					}
				});

				scrubber.click(function(event) {
					if (video[0].paused) {
						video[0].play();
					}
					else {
						video[0].pause();
					}
				});

				li.mouseover(function(event) {

					scrubber.addClass('scrubberActive');
				});

				li.mouseleave(function(event) {

					scrubber.removeClass('scrubberActive');
				});


			})(file, clientdata, iteration++);
		};

		//files
		for (file in clientdata.files) {

			(function(file, clientdata, iteration) {

				var data = clientdata.files[file];
				var li = $('<li class="file"></li>');
				$('#listing').append(li);

				var preview = $('<div class="preview" />');
				li.append(preview);
				var clickOverlay = $('<div class="click-overlay" />');
				li.append(clickOverlay);
				var scrubber = $('<div class="scrubber" />');
				li.append(scrubber);
				var framecounter = $('<div class="frame-counter" />');
				scrubber.append(framecounter);
				var caption = $('<div class="caption">' + data.filename + '</div>');
				li.append(caption);
				

				var image = $('<img />').attr('src', '/thumbs' + clientdata.location + '/' + file);

				$(image).on('load', function() {
					
					var height = this.height;
					var width = this.width;
					var maxFrame = (tiles.x * tiles.y) - 1;
					var currentFrame = getRandomInt(0, maxFrame);
					var paused = false;
					var currentPrecentagePosition = 50;

					width = (preview.width() / clientdata.thumbSize.width) * width;
					height = (preview.height() / clientdata.thumbSize.height) * height;

					var aspectRatio =  height / width;
					var cssheight = preview.width() * aspectRatio;

					var setBackgroundPosition = function(delta) {
						currentFrame = currentFrame + delta;
						currentFrame = currentFrame > maxFrame ? 0 : currentFrame;
						currentFrame = currentFrame < 0 ? maxFrame : currentFrame;
						backgroundPosition = getBackgoundPosition(currentFrame, width, height);
						applyBackgroundPosition(preview, backgroundPosition);
						framecounter.text(Math.round((currentFrame / maxFrame) * 100) + '%');
					};

					preview.css('height', cssheight + 'px');
					preview.css('background-image', 'url("/thumbs' + clientdata.location + '/' + file + '")');
					preview.css('background-size', width + 'px ' + height + 'px');

					setBackgroundPosition(0);
					

					// setTimeout(function() {
					// 	setInterval(function() {
							
					// 		if (!paused) {
					// 			setBackgroundPosition(1);
					// 		}
					// 	}, 3000);
					// }, iteration * 100);

					var scrollInterval;

					clickOverlay.mouseleave(function(event) {
						paused = false;
						//clearInterval(scrollInterval);
					});

					clickOverlay.click(function(event) {
						
						var offset = $(this).offset();
						var percentageOfWidth = Math.round(((event.pageX - offset.left) / preview.width()) * 100);

						if (scrollInterval) {
							clearInterval(scrollInterval);
							scrollInterval = null;
							return;
						}

						if (percentageOfWidth < 25) {
							scrollInterval = setInterval(function() {
								setBackgroundPosition(-1);
							}, clientdata.scrollSpeed);
						}
						else if (percentageOfWidth > 75) {
							scrollInterval = setInterval(function() {
								setBackgroundPosition(1);
							}, clientdata.scrollSpeed);
						}
						else {
							window.location = '/thumbs' + clientdata.location + '/' + file;
						}
					});

					// preview.mousemove(function(event) {

					// 	var offset = $(this).offset();
					// 	var percentageOfWidth = Math.round(((event.pageX - offset.left) / 320) * 100);

					// 	if (percentageOfWidth > currentPrecentagePosition) {
					// 		currentFrame = (currentFrame + 1) % 100;
					// 	}
					// 	else if (percentageOfWidth < currentPrecentagePosition) {
					// 		currentFrame = (currentFrame + 1) % 100;
					// 	} else {
					// 		return; //same value, no changes
					// 	}
					// 	backgroundPosition = getBackgoundPosition(currentFrame, width, height);
					// 	applyBackgroundPosition(preview, backgroundPosition);
					// 	framecounter.text(currentFrame);
					// 	currentPrecentagePosition = percentageOfWidth;
					// });
				});

			})(file, clientdata, iteration++);	
		}
	});

	var applyBackgroundPosition = function(element, result) {

		element.css('background-position', result.x + 'px ' + result.y + 'px');
		// element.animate({
		// 	'background-position-x': result.x,
		// 	'background-position-y': result.y
		// });
	};

	var getBackgoundPosition = function(frameNumber, width, height) {

		var column = frameNumber % tiles.x;
		var row = Math.floor(frameNumber / tiles.y);

		var xPos = (column * (width / tiles.x)) * -1;
		var yPos = (row * (height / tiles.y)) * -1;

		return {
			x: xPos,
			y: yPos
		}
	};

	var getRandomInt = function(min, max) {

		return Math.floor(Math.random() * (max - min + 1)) + min;
	};

})();