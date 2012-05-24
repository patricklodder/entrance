var url = require('url')
	, qs = require('querystring')
	, util = require('util')
	, events = require('events');

function Transaction (req, res, matches, cb) {
	this.req = req;
	this.res = res;
	this.matches = (matches === true) ? [] : matches || [];
	this.body = {};
	this.chunks = [];
	this.callback = cb;
	
	var self = this;
	
	if (this.req.method.toLowerCase() === 'post') {
		
		this.req.on('data', function (c) { 
			self.chunks.push(c);
		});
		
		this.req.on('end', function () {
			self.body = qs.parse(self.chunks.join(''));
		});
	}
	
	this.handle = function (func) {
		var err = false;
		try {
			this.call(func);
		} catch (e) {
			err = e;
		}
		cb(err);
	};
};

function Route (method, route, controller) {
	this.route = route;
	this.isRegExp = (typeof(route) === 'object' && route instanceof RegExp);
	this.method = method;
	this.controller = controller;
	
	this.key = function() {
		return (this.isRegExp) ? route.toString() : route;
	};
	
	this.match = function(path) {
		return (this.isRegExp) ? this.route.exec(path) : (path === this.route);
	};
}

function Entrance (options) {
	this.options = options;
	this.routes = {};
	this.callback = function(){};
}

util.inherits(Entrance, events.EventEmitter);

Entrance.prototype.add = function (method, route, controller, strict) {
	var r = new Route(method, route, controller);
	method = method.toLowerCase();
	if (!this.routes.hasOwnProperty(method)) this.routes[method] = {};
	
	var key = r.key();
	
	if (strict && this.routes[method].hasOwnProperty(key)) {
		throw 'Route "' + key + '" already exists.';
	} else this.routes[method][key] = r;
};

Entrance.prototype.dispatch = function (req, res) {
	var methods = ['all', req.method.toLower()];
	var path = url.parse(req.url).pathname;
	var i = 2;
	
	while (i--) {
		if (this.routes.hasOwnProperty(methods[i]) && typeof(this.routes[methods[i]]) === 'object') {
			for (var k in this.routes[method[i]]) {
				var r = this.routes[method[i]][k], match;
				
				if (match = r.match(path)) {
					(new Transaction(req, res, match, this.callback)).handle(r.controller);
					return;
				}
			}
		}
	}
	
	this.callback('No route could be matched');	
	
};

module.exports = Entrance;