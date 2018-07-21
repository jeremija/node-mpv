
watch: FORCE
	chastifol [ $(MAKE) js-watch ] [ $(MAKE) css-watch ] [ $(MAKE) server-watch ]

server-watch: FORCE
	nodemon --ignore .git --ignore public-gen src/client index.js

js-watch: FORCE
	watchify -v --debug \
		-p [ livereactload --port 4474 ] \
		-t babelify \
		src/client/index.js \
		-o src/public-gen/index.js

js: FORCE
	browserify -v --debug \
		-p [ livereactload --port 4474 ] \
		-t babelify \
		src/client/index.js \
		-o src/public-gen/index.js

css: FORCE
	node-sass src/scss/style.scss -o src/public-gen/style.css

css-watch: FORCE css
	node-sass --watch src/scss/style.scss -o src/public-gen/style.css

FORCE:
