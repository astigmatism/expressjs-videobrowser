var Application = (function() {

	$( document ).ready(function() {

		var $gridwrapper = $('.grid-wrapper');
		var $title = $('.title');
		var $back = $('.back');

		var Gallery = new vbGallery($('#image-gallery'), $gridwrapper);

		var iteration = 0;

		//main grid
		var $grid = $('#grid').packery({
  			itemSelector: '.grid-item',
			transitionDuration: 0
		});

		//title
		$title.on('click touch', function(event) {
			window.refresh();
		});

		//back button
		$back.on('click touch', function () {
			window.history.back();
		});

		//folders
		for (folder in clientdata.folders) {

			(function(folder, clientdata) {

				var data = clientdata.folders[folder];

				var $gi = $('<div class="grid-item folder"></div>');

				var caption = $('<div class="caption">' + folder + '</div>');
				$gi.append(caption);

				$gi.on('click touch', function () {
					window.location = clientdata.location + '/' + folder;
				});

				$grid.append($gi).packery('appended', $gi);

				//image previews for folder
				if (data.preview.length > 0) {
					
					//make new preview grid
					var $innerGrid = $('<div class="preview-grid"></div>');
					$gi.append($innerGrid);

					var $previewGrid = $innerGrid.packery({
						itemSelector: '.preview-grid-item',
						transitionDuration: 0
					});

					for (var i = 0; i < data.preview.length; ++i) {
						var $previewImageGridItem = $('<div class="preview-grid-item invisible"></div>');
						var $previewImage = $('<img src="' + data.preview[i].thumb + '" />');
						
						$previewImageGridItem.append($previewImage);
						$previewGrid.append($previewImageGridItem).packery('appended', $previewImageGridItem);
					} 

					$previewGrid.imagesLoaded().progress( function() {
						$previewGrid.packery();
						$('.preview-grid-item').imagefill({
							runOnce: true
						});
						$('.preview-grid-item').removeClass('invisible');
					});
				}

			})(folder, clientdata);
		}

		//images
		var galleryImages = [];
		for (file in clientdata.images) {

			(function(file, clientdata, iteration) {

				var data = clientdata.images[file];

				//dom
				var $gi = $('<div class="grid-item image invisible"></div>');
				var $image = $('<img src="' + data.thumb + '" data-high-res-src="' + data.media + '" />');
				$gi.append($image);
				var $clickOverlay = $('<div class="click-overlay" />');
				$gi.append($clickOverlay);
				
				//for gallery feature
				galleryImages.push({
					small: data.thumb,
					big: data.media
				});

				var galleryIndex = galleryImages.length; //the current length is the index of this image

				$clickOverlay.click(function(event) {
					Gallery.Show(galleryImages, galleryIndex, false);
				});

				$grid.append($gi).packery('appended', $gi);

			})(file, clientdata, iteration++);
		};

		//videos (old)
		// for (file in clientdata.videosOLD) {

		// 	(function(file, clientdata, iteration) {

		// 		var data = clientdata.videos[file];
		// 		var $gi = $('<div class="grid-item video" />');

		// 		var caption = $('<div class="caption">' + file + '</div>');
		// 		//$gi.append(caption);
		// 		var videowrapper = $('<div class="videowrapper" />');
		// 		$gi.append(videowrapper);

		// 		var video = $('<video />', {
		// 		    id: 'video',
		// 		    src: data.thumb,
		// 		    type: 'video/mp4',
		// 		    controls: false,
		// 		    autoplay: false,
		// 		    preload: true
		// 		});
		// 		videowrapper.append(video);

		// 		var scrubber = $('<div class="scrubber scrubberActive" />');
		// 		videowrapper.append(scrubber);
		// 		var marker = $('<div class="marker" />');
				
		// 		scrubber.append(marker);

		// 		video.on('loadedmetadata', function() {
		// 			this.currentTime = getRandomInt(1, this.duration);
		// 		});

		// 		video.on('timeupdate', function() {
		// 			var perc = this.currentTime / this.duration;
		// 			marker.css('left',  (video.width() * perc) + 'px');
		// 		});

		// 		var clickOverlay = $('<div class="click-overlay" />');
		// 		videowrapper.append(clickOverlay);

		// 		clickOverlay.click(function(event) {
						
		// 			var offset = $(this).offset();
		// 			var percentageOfWidth = Math.round(((event.pageX - offset.left) / $gi.width()) * 100);

		// 			if (percentageOfWidth < 25) {

		// 				//back 5 seconds
		// 				video[0].currentTime = (video[0].currentTime - 5) > 0 ? video[0].currentTime - 5 : video[0].currentTime;
		// 				video[0].play();
		// 				video.prop('muted', true);
		// 			}
		// 			else if (percentageOfWidth > 75) {	
					
		// 				//back 5 seconds
		// 				video[0].currentTime = (video[0].currentTime + 5) < video[0].duration ? video[0].currentTime + 5 : video[0].currentTime;
		// 				video[0].play();
		// 				video.prop('muted', true);
		// 			}
		// 			else {
		// 				if (video[0].paused) {
		// 					window.open(data.media);
		// 				} else {
		// 					scrubber.click();
		// 				}
		// 			}
		// 		});

		// 		// scrubber.mousemove(function(event) {

		// 		// 	if (video[0].paused) {

		// 		// 		var offset = $(this).offset();
		// 		// 		var percentageOfWidth = Math.round(((event.pageX - offset.left) / $(this).width()) * 100);
						
		// 		// 		video[0].currentTime = (percentageOfWidth * .01) * video[0].duration;
		// 		// 	}
		// 		// });

		// 		// scrubber.click(function(event) {
		// 		// 	if (video[0].paused) {
		// 		// 		video[0].play();
		// 		// 		video.prop('muted', true);
		// 		// 	}
		// 		// 	else {
		// 		// 		video[0].pause();
		// 		// 	}
		// 		// });

		// 		$grid.append($gi).packery('appended', $gi);

		// 	})(file, clientdata, iteration++);
		// };

		//files
		for (file in clientdata.videos) {

			(function(file, clientdata, iteration) {

				var data = clientdata.videos[file];
				var $gi = $('<div class="grid-item video" />');

				$grid.append($gi).packery('appended', $gi);

				var $framecounter = $('<div class="frame-counter" />');
				$gi.append($framecounter);
				var $preview = $('<div class="preview" />');
				$gi.append($preview);
				var $clickOverlay = $('<div class="click-overlay" />');
				$gi.append($clickOverlay);
				var $caption = $('<div class="caption">' + data.filename + '</div>');
				$gi.append($caption);
				
				

				var $image = $('<img />').attr('src', data.thumb);

				$image.on('load', function() {
					
					var height = this.height;
					var width = this.width;
					var maxFrame = (clientdata.framesPerAxis * clientdata.framesPerAxis) - 1;
					var currentFrame = 1; //getRandomInt(0, maxFrame);
					var paused = false;
					var currentPrecentagePosition = 50;

					//frame size
					var framewidth = width / clientdata.framesPerAxis;
					var frameheight = height / clientdata.framesPerAxis;

					var setBackgroundPosition = function(delta) {
						
						currentFrame = currentFrame + delta;
						currentFrame = currentFrame > maxFrame ? 0 : currentFrame;
						currentFrame = currentFrame < 0 ? maxFrame : currentFrame;

						backgroundPosition = getBackgoundPosition(currentFrame, width, height, clientdata.framesPerAxis);
						$preview.css('background-position', backgroundPosition.x + 'px ' + backgroundPosition.y + 'px');
						$framecounter.text(Math.round((currentFrame / maxFrame) * 100) + '%');
					};

					$preview.css('height', frameheight + 'px');
					$preview.css('width', framewidth + 'px');
					$caption.css('width', framewidth + 'px');
					$preview.css('background-image', 'url("' + data.thumb + '")');
					$preview.css('background-size', width + 'px ' + height + 'px');

					setBackgroundPosition(0);

					$clickOverlay.click(function(event) {
						
						var offset = $(this).offset();
						var percentageOfWidth = Math.round(((event.pageX - offset.left) / framewidth) * 100);

						if (percentageOfWidth < 25) {
							setBackgroundPosition(-1);
						}
						else if (percentageOfWidth > 75) {
							setBackgroundPosition(1);
						}
						else {
							window.location = data.media;
						}
					});
				});

			})(file, clientdata, iteration++);	
		}

		$grid.imagesLoaded().progress( function() {
			$grid.packery();
			$('.grid-item').removeClass('invisible');
		});
	});

	var applyBackgroundPosition = function(element, result) {

		
		// element.animate({
		// 	'background-position-x': result.x,
		// 	'background-position-y': result.y
		// });
	};

	var getBackgoundPosition = function(frameNumber, width, height, framesPerAxis) {

		var column = frameNumber % framesPerAxis;
		var row = Math.floor(frameNumber / framesPerAxis);

		var xPos = (column * (width / framesPerAxis)) * -1;
		var yPos = (row * (height / framesPerAxis)) * -1;

		return {
			x: xPos,
			y: yPos
		}
	};

	var getRandomInt = function(min, max) {

		return Math.floor(Math.random() * (max - min + 1)) + min;
	};

	var Gallery = function(images, startAt, slideshowEnabled) {
		
		
	}

})();