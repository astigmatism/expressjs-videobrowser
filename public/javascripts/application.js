var Application = (function() {

	$( document ).ready(function() {

		var $gridwrapper = $('.grid-wrapper');
		var $title = $('.title');
		var $back = $('.back');
		var $gallery = $('#image-gallery');
		var $gallerylink = $('.gallerylink');
		var $galleryclose = $('#image-gallery .iv-close');

		//set up grid first
		var $grid = $('#grid').isotope({
			itemSelector: '.grid-item',
			layoutMode: 'fitRows'
		});

		var tiles = clientdata.tiles;

		//title
		$title.on('click touch', function(event) {
			window.refresh();
		});

		//back button
		$back.on('click touch', function () {
			window.history.back();
		});

		//gallery
		$gallerylink.on('click touch', function () {
				
			//set height dynamically, needs an actual value not %
			$gallery.height($(window).height());

			$gallery.show();
			$gridwrapper.hide();

			Gallery(galleryImages);
		});

		$galleryclose.on('click touch', function () {
			$gridwrapper.show();
			$gallery.hide();
			$(window).off('keydown');
		});

		//folders
		for (folder in clientdata.folders) {

			(function(folder, clientdata) {

				var div = $('<div class="grid-item folder"></div>');

				var caption = $('<div class="caption">' + folder + '</div>');
				div.append(caption);

				div.on('click touch', function () {
					window.location = clientdata.location + '/' + folder;
				});

				$grid.isotope('insert', div);

			})(folder, clientdata);
		}

		var iteration = 0;
		var galleryImages = [];

		//images
		if (Object.keys(clientdata.images).length > 0) {
			$gallerylink.show();
		}

		for (file in clientdata.images) {

			(function(file, clientdata, iteration) {

				var data = clientdata.images[file];

				//dom
				var div = $('<div class="grid-item image"></div>');
				var image = $('<img src="' + data.thumb + '" data-high-res-src="' + data.media + '" />');
				div.append(image);
				var clickOverlay = $('<div class="click-overlay" />');
				div.append(clickOverlay);
				
				//for gallery feature
				galleryImages.push({
					small: data.thumb,
					big: data.media
				});

				clickOverlay.click(function(event) {
					
					//see viewer docs: http://ignitersworld.com/lab/imageViewer.html
					var viewer = ImageViewer();
        			viewer.show($(image).attr('src'), $(image).data('high-res-src'));
				});

				$grid.isotope('insert', div);

			})(file, clientdata, iteration++);
		};

		//videos
		for (file in clientdata.videos) {

			(function(file, clientdata, iteration) {

				var data = clientdata.videos[file];
				var $gi = $('<div class="grid-item video" />');

				$grid.isotope('insert', $gi);

				var caption = $('<div class="caption">' + file + '</div>');
				//$gi.append(caption);
				var videowrapper = $('<div class="videowrapper" />');
				$gi.append(videowrapper);

				var video = $('<video />', {
				    id: 'video',
				    src: data.thumb,
				    type: 'video/mp4',
				    controls: false,
				    autoplay: false,
				    preload: true
				});
				videowrapper.append(video);

				var scrubber = $('<div class="scrubber scrubberActive" />');
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
					var percentageOfWidth = Math.round(((event.pageX - offset.left) / $gi.width()) * 100);

					if (percentageOfWidth < 25) {

						//back 5 seconds
						video[0].currentTime = (video[0].currentTime - 5) > 0 ? video[0].currentTime - 5 : video[0].currentTime;
						video[0].play();
						video.prop('muted', true);
					}
					else if (percentageOfWidth > 75) {	
					
						//back 5 seconds
						video[0].currentTime = (video[0].currentTime + 5) < video[0].duration ? video[0].currentTime + 5 : video[0].currentTime;
						video[0].play();
						video.prop('muted', true);
					}
					else {
						if (video[0].paused) {
							window.open(data.media);
						} else {
							scrubber.click();
						}
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
						video.prop('muted', true);
					}
					else {
						video[0].pause();
					}
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

		$grid.imagesLoaded().progress( function() {
			$grid.isotope('layout');
		});
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

	var Gallery = function(images) {
		
		var curImageIdx = 1,
			total = images.length;
		var wrapper = $('#image-gallery'),
			curSpan = wrapper.find('.current');
		var viewer = ImageViewer(wrapper.find('.image-container'));
		var slideshowtimer = null;
	
		//display total count
		wrapper.find('.total').html(total);
	
		function showImage(){
			var imgObj = images[curImageIdx - 1];
			viewer.load(imgObj.small, imgObj.big);
			curSpan.html(curImageIdx);
		}

		var next = function() {
			curImageIdx++;
			if(curImageIdx > total) curImageIdx = 1;
			showImage();
		};

		var prev = function() {
			curImageIdx--;
			if(curImageIdx < 1) curImageIdx = total;
			showImage();
		};
	
		wrapper.find('.next').click(function(){
			next();
		});
	
		wrapper.find('.prev').click(function(){
			prev();
		});

		wrapper.find('.slideshowlabel').click(function() {
			slideshow();
		});

		var slideshow = function() {
			if (slideshowtimer) {
				clearInterval(slideshowtimer);
				slideshowtimer = null;
				wrapper.find('.slideshowlabel').text('Start');
			}
			else {
				slideshowtimer = setInterval(function() {
					next();
				}, 2000);
				wrapper.find('.slideshowlabel').text('Stop');
			}
		};

		//keypress events
		$(window).keydown(function(event) {
			event.preventDefault();
			
			switch(event.which) {
				case 37:
					prev();
					break;
				case 39:
					next();
					break;
				case 32:
					slideshow();
					break;
			}
		});

		//initially show image
		showImage();
		slideshow();
	}

})();