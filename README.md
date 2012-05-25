entrance
========

Lightweight node.js http router

Usage:

	var Entrance = require('./entrance');
	var router = new Entrance();

	router.get('/', function() {
		this.res.writeHead(200, {'Content-type': 'text/html'});
		this.res.end('<h1>hello world</h1>');
	});
