var Application = (function() {

	$( document ).ready(function() {

		var $gridwrapper = $('.grid-wrapper');
		var $title = $('.title');
		var $back = $('.back');
		var framesPerAxis = clientdata.framesPerAxis; //please mater with server

		var Gallery = new vbGallery($('#image-gallery'), $gridwrapper);

		var iteration = 0;

		//main grid
		var $grid = $('#grid').packery({
  			itemSelector: '.grid-item',
			transitionDuration: 0,
			gutter: 10
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

						(function(details) {

							var $previewImageGridItem = $('<div class="preview-grid-item invisible"></div>');
							var $previewImage = $('<img src="' + details.data.thumb + '" />');
							
							$previewImageGridItem.append($previewImage);

							//append to dom here for image to load
							$previewGrid.append($previewImageGridItem).packery('appended', $previewImageGridItem);

							$previewImageGridItem.imagesLoaded().progress( function() {

								if (details.type === 'video') {

									//let's find a frame focal point to zoom on
									var frameWidth = ($previewImage.width() / framesPerAxis);
									var frameHeight = ($previewImage.height() / framesPerAxis);
									var x = (frameWidth * getRandomInt(0, framesPerAxis -1));
									var y = (frameHeight * getRandomInt(0, framesPerAxis -1));

									$previewImageGridItem.addClass('videopreview');

									$previewImage.css('left', x * -1); //-1 to move image to left
									$previewImage.css('top', y * -1);

									$previewImageGridItem.removeClass('invisible');
								}

								else if (details.type === 'image') {

									//scale image to fill container and remove hidden
									$previewImage.imageScale();
									$previewImageGridItem.removeClass('invisible');
								}
							});

						})(data.preview[i]);
					}
					$previewGrid.packery();
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

		//videos
		for (file in clientdata.videos) {

			(function(file, clientdata, iteration) {

				var data = clientdata.videos[file];
				var $gi = $('<div class="grid-item video" />');

				var $preview = $('<div class="preview" />');
				$gi.append($preview);
				var $clickOverlay = $('<div class="click-overlay" />');
				$gi.append($clickOverlay);
				var $caption = $('<div class="caption"><span class="filename">' + data.filename + '</span></div>');
				var $framecounter = $('<span class="frame-counter" />');
				$caption.append($framecounter);
				$gi.append($caption);
				
				

				var $image = $('<img />').attr('src', data.thumb);

				$image.on('load', function() {
					
					var height = this.height;
					var width = this.width;
					var maxFrame = (clientdata.framesPerAxis * clientdata.framesPerAxis) - 1;
					var currentFrame = getRandomInt(0, maxFrame);
					var paused = false;
					var currentPrecentagePosition = 50;

					//frame size
					var frameWidth = width / clientdata.framesPerAxis;
					var frameHeight = height / clientdata.framesPerAxis;

					var setBackgroundPosition = function(delta) {
						
						currentFrame = currentFrame + delta;
						currentFrame = currentFrame > maxFrame ? 0 : currentFrame;
						currentFrame = currentFrame < 0 ? maxFrame : currentFrame;

						backgroundPosition = getBackgoundPosition(currentFrame, width, height, clientdata.framesPerAxis);
						$preview.css('background-position', backgroundPosition.x + 'px ' + backgroundPosition.y + 'px');
						$framecounter.text(Math.round((currentFrame / maxFrame) * 100) + '%');
					};

					$preview.css('height', frameHeight + 'px');
					$preview.css('width', frameWidth + 'px');
					$caption.css('width', frameWidth + 'px');
					$preview.css('background-image', 'url("' + data.thumb + '")');
					$preview.css('background-size', width + 'px ' + height + 'px');

					setBackgroundPosition(0);

					$clickOverlay.click(function(event) {
						
						var offset = $(this).offset();
						var percentageOfWidth = Math.round(((event.pageX - offset.left) / frameWidth) * 100);

						if (percentageOfWidth < 25) {
							setBackgroundPosition(-1);
						}
						else if (percentageOfWidth > 75) {
							setBackgroundPosition(1);
						}
						else {

							var $video = $('<video />', {								
								src: data.media,
								type: 'video/mp4',
								preload: true,
								autoplay: true,
								width: frameWidth,
								height: frameHeight
							});

							$clickOverlay.unbind('click touch');
							$framecounter.hide();

							//replace preview with video!
							$clickOverlay.html($video);
							
							$video.mediaelementplayer({
								videoWidth: frameWidth,
								videoHeight: frameHeight,
								hideVideoControlsOnPause: true
							});

							var $mep = $clickOverlay.find('[id^="mep"]');

							$mep.focus();
						}
					});

					$grid.append($gi).packery('appended', $gi);
				});

			})(file, clientdata, iteration++);	
		}

		$grid.imagesLoaded().progress( function() {
			$grid.packery();
			$('.grid-item').removeClass('invisible');
		});
	});

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