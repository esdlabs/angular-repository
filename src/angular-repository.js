/**
 * @license ngRepository v1.0.0
 * (c) 2014 ESD Engineering & Service, Inc. http://esd.com.do
 * License: Private
 */
(function(window, angular, undefined) {'use strict';

var i = 0; // @todo
var $repositoryMinErr = angular.$$minErr('$repository');

/**
 * Create a shallow copy of an object and clear other fields from the destination
 *
 * @param  {Object} src
 * @param  {Object} dst
 * @return {Object}
 */
var shallowClearAndCopy = function (src, dst) {
    dst = dst || {};

    angular.forEach(dst, function (value, key) {
        delete dst[key];
    });

    for (var key in src) {
        if (src.hasOwnProperty(key) && !(key.charAt(0) === '$' && key.charAt(1) === '$')) {
            dst[key] = src[key];
        }
    }

    return dst;
};

angular.module('ngRepository', ['ng', 'ngResource'])

    .provider('$repository', function () {

        this.$$endpointPrefix = '/';
        this.$$debugEndpointPrefix = '/';

        this.defaults = {
            // Strip slashes by default
            stripTrailingSlashes: true,

            actions: {
                'get': {method: 'GET'},
                'save': {method: 'POST'},
                'query': {method: 'GET', isArray: true},
                'remove': {method: 'DELETE'},
                'delete': {method: 'DELETE'}
            }
        };

        /**
         * [endpointPrefix description]
         * @param  {[type]} endpointPrefix
         * @return {[type]}
         */
        this.endpointPrefix = function (endpointPrefix) {
            this.$$endpointPrefix = endpointPrefix;
        };

        /**
         * [debugEndpointPrefix description]
         * @param  {[type]} debugEndpointPrefix
         * @return {[type]
         */
        this.debugEndpointPrefix = function (debugEndpointPrefix) {
            this.$$debugEndpointPrefix = debugEndpointPrefix;
        };

        /**
         * [$$endpoint description]
         * @param  {[type]} endpoint [description]
         * @param  {[type]} debug    [description]
         * @return {[type]}          [description]
         */
        this.$$endpoint = function (endpoint, debug) {
            return (debug ? this.$$debugEndpointPrefix : this.$$endpointPrefix) + endpoint;
        };

        var provider = this;

        /**
         * [$get description]
         * @param  {[type]} $resource [description]
         * @param  {[type]} $log      [description]
         * @return {[type]}           [description]
         */
        this.$get = function ($resource, $log) {

            return function (endpoint, config, debug) {

                var debugMode = debug ? true : provider.debug ? true : false;
                config.actions = angular.extend({}, provider.defaults.actions, config.actions);

                function Repository (value) {

                    /**
                     * [validateType description]
                     * @param  {[type]} type [description]
                     * @return {[type]}      [description]
                     */
                    var validateType = function (type) {

                        var types = ['array', 'object', 'string', 'date', 'regexp', 'function', 'boolean', 'number', 'null', 'undefined'];
                        return types.indexOf(type) !== -1 ? true : false;
                    };

                    var actions = angular.extend({}, provider.defaults.actions, config.actions);
                    var Engine = $resource(provider.$$endpoint(endpoint), {}, actions, {});

                    // Instance the Resource
                    this.$$engine = new Engine(value);

                    angular.forEach(this.$$engine, function (value, property) {

                        var attribute = config.attributes[property];
                        var type = attribute.type.toLowerCase();

                        if (attribute && validateType(type)) {

                            if (type === 'object' && angular.isObject(this[property])) {

                                if (!this[property].$$isRepository && attribute.hasOwnProperty('repository')) {

                                    // @todo validate that the 'attribute.repository' is a valid $repository
                                    this[property] = new attribute.repository(value);
                                }
                            }

                            // @todo should implement the function when the property is an array
                            // if (type === 'array' && angular.isArray(this[property])) {}

                            return this[property];
                        }

                        throw $repositoryMinErr('invalidproperty', 'The "{0}" property is invalid.', property);

                    }, this.$$engine);

                    // Set the properties
                    angular.forEach(config.attributes, function (attribute, name) {

                        Object.defineProperty(this, name, {

                            get: function () {
                                return this.$$engine[name];
                            },

                            set: function (value) {
                                this.$$engine[name] = value;
                            },

                            enumerable: true
                        });
                    }, this);

                    // Initialize function
                    this.initialize.apply(this, arguments);
                };

                /**
                 * Return the attributes definitions
                 * @return {Object}
                 */
                Repository.define = function () {
                    return config.attributes;
                };

                //
                angular.forEach(config.actions, function (action, name) {

                    // var hasBody = /^(POST|PUT|PATCH)$/i.test(action.method);

                    Repository[name] = function (a1, a2, a3, a4) {

                        var isInstanceCall = this instanceof Repository;

                        if (isInstanceCall) {

                            console.log(arguments.length);
                            console.log(a1, a2, a3, a4);
                            console.log(this['$' + name]);

                            // this['$' + name](a1, a2, a3, a4);
                        }

                        return name;
                    };

                    Repository.prototype['$' + name] = function (params, success, error) {

                        if (angular.isFunction(params)) {
                            error = success; success = params; params = {};
                        }

                        var result = this.$$engine['$' + name].call(this.$$engine, params, this, success, error);
                        return result.$promise || result;
                    };
                });

                angular.extend(Repository.prototype, config.methods, {

                    /**
                     * The default name for the JSON `id` attribute is `"id"`.
                     * @type {String}
                     */
                    idAttribute: config.idAttribute || 'id',

                    /**
                     * Initialize is an empty function by default. Override
                     * it with your own initialization logic.
                     * @return {void}
                     */
                    initialize: config.initialize || function () {},

                    /**
                     * A repository is new if it has never been saved to the server, and lacks an id.
                     * @return {Boolean}
                     */
                    isNew: function() {
                      return !this.hasOwnProperty(this.idAttribute);
                    },

                    /**
                     * Covert to a json string
                     * @return {String}
                     */
                    toJSON: function () {

                        var data = angular.extend({}, this);

                        delete data.$promise;
                        delete data.$resolved;

                        return data;
                    },

                    /**
                     * Return the attributes definitions
                     * @return {@Repository.attributes}
                     */
                    $define: function () {
                        return Repository.define();
                    },

                    /**
                     * [$$isRepository description]
                     * @type {Boolean}
                     */ // UGLY HACK
                    $$isRepository: true
                });

                return Repository;
            };
        };
    });


    // // Is this useful? is this good?
    // Repository.collection = function (items) {
    //     this.items = [];
    //     angular.forEach(items, function (item) {
    //         this.push(new Repository(item));
    //     }, this.items);
    //     return this.items;
    // };

    // Repository.extend = function () {

    //     return this;
    // };



})(window, window.angular);
