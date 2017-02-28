var Application = function() {
	
	$( document ).ready(function() {


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

		//files
		for (file in clientdata.files) {

			(function(file, clientdata) {

				var data = clientdata.files[file];
				var li = $('<li class="file"></li>');

				var preview = $('<div class="preview" />');
				li.append(preview);

				var image = $('<img />').attr('src', '/thumbs' + clientdata.location + '/' + file);

				$(image).on('load', function() {
					
					var height = this.height;
					var width = this.width;

					var aspectRatio =  height / width;
					var cssheight = 320 * aspectRatio;

					preview.css('height', cssheight + 'px');

					preview.css('background-image', 'url("/thumbs' + clientdata.location + '/' + file + '")');

					preview.mousemove(function(event) {

						var offset = $(this).offset();

						var percentageOfWidth = Math.round(((event.pageX - offset.left) / 320) * 100);
						var column = percentageOfWidth % 10;
						var row = Math.floor(percentageOfWidth / 10);

						var xPos = (column * (width / 10)) * -1;
						var yPos = (row * (height / 10)) * -1;

						preview.css('background-position', xPos + 'px ' + yPos + 'px');
					});
				});

				var caption = $('<div class="caption">' + data.filename + '</div>');
				li.append(caption);


				
				$('#listing').append(li);
			})(file, clientdata);	
		}
	});

}();

Application.getRandomFrame = function(width, height, callback) {

};