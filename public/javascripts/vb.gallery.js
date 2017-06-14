var vbGallery = (function($wrapper, $gridwrapper) {

    //private members
    var _instance = this;
    var _currentImageIndex = 0;
	var _total = null;
    var _timer = null;
    var _images = [];
    var _slideDuration = 2000;

    var _$imageGallery = $wrapper;
    var _lblCurrent = _$imageGallery.find('.current');
    var _viewer = ImageViewer(_$imageGallery.find('.image-container'));
    var _lblSlideshow = _$imageGallery.find('.slideshowlabel');
    var _lblTotal = _$imageGallery.find('.total');
    var _lblNext = _$imageGallery.find('.next');
    var _lblPrev = _$imageGallery.find('.prev');
    var _$close = $('#image-gallery .iv-close');

    //constructor
    $(document).ready(function() {
        
        //event bindings
        _lblNext.on('click touch', function(){
			Next();
		});
	
		_lblPrev.on('click touch', function(){
			Previous();
		});

		_lblSlideshow.on('click touch', function() {
			StartSlideShow();
		});

        _$close.on('click touch', function () {
			_instance.Hide();
		});
    });

    //public methods
    this.Show = function(images, startAtIndex, startSlideShow) {

        _images = images;
        _total = images.length;
        _currentImageIndex = startAtIndex;

        $wrapper.height($(window).height());
        $wrapper.show();
        $gridwrapper.hide();

        //display total count
		_lblTotal.html(_total);

        BindKeydownEvent(); //attach handler to window

        //show initial image (start!)
        ShowImage();

        if (startSlideShow) {
            StartSlideShow();
        }
    };

    this.Hide = function() {

        $wrapper.hide();
        $gridwrapper.show();
        StopSlideShow();

        //unbind events on exit
        $(window).off('keydown');
    };

    //private
    var Next = function() {
        _currentImageIndex++;
        if(_currentImageIndex > _total) _currentImageIndex = 1;
        ShowImage();
    };

    var Previous = function() {
        _currentImageIndex--;
        if(_currentImageIndex < 1) _currentImageIndex = _total;
        ShowImage();
    };

    var ShowImage = function() {
        var imageObject = _images[_currentImageIndex - 1];
        
        if (imageObject.hasOwnProperty('small') && imageObject.hasOwnProperty('big')) {

            _viewer.load(imageObject.small, imageObject.big);
            _lblCurrent.html(_currentImageIndex);
        }
    };

    var StartSlideShow = function() {

        _timer = setInterval(function() {
            Next();
        }, _slideDuration);
        _lblSlideshow.text('Stop');
    };

    var StopSlideShow = function() {

        if (_timer) {
            clearInterval(_timer);
            _timer = null;
            _lblSlideshow.text('Start');
        }
    };

    var BindKeydownEvent = function() {
        $(window).keydown(function(event) {
			event.preventDefault();
			
			switch(event.which) {
				case 37:
					Previous();
					break;
				case 39:
					Next();
					break;
				case 32:
					if (_timer) {
                        StopSlideShow();
                    } else {
                        StartSlideShow();
                    }
					break;
			}
		});
    };

});