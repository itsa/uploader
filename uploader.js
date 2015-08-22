
/**
 * Provides core Upload-functionality.
 * Also defines` HTMLInputElement.prototype.sendFiles`.
 *
 *
 * <i>Copyright (c) 2014 ITSA - https://github.com/itsa</i>
 * New BSD License - http://choosealicense.com/licenses/bsd-3-clause/
 *
 * @module uploader
 * @class Uploader
*/

"use strict";

require('polyfill/polyfill-base.js');
require('./css/uploader.css');

var NAME = '[uploader]: ',
    later = require('utils').later,
    jsext = require('js-ext/js-ext.js'), // we need the full version
    Classes = jsext.Classes,
    createHashMap = jsext.createHashMap,
    TEMPLATE = '<input class="uploader-hidden-input" type="file">';

module.exports = function (window) {
    var Event = require('event'),
        IO = require("io/extra/io-filetransfer.js")(window),
        Uploader;

    // to prevent multiple Uploader instances
    // (which might happen: http://nodejs.org/docs/latest/api/modules.html#modules_module_caching_caveats)
    // we make sure Uploader is defined only once. Therefore we bind it to `window` and return it if created before
    // We need a singleton Uploader, because submodules might merge in. You can't have them merging
    // into some other Uploader-instance than which is used.

    window._ITSAmodules || Object.protectedProp(window, '_ITSAmodules', createHashMap());
/*jshint boss:true */
    if (Uploader=window._ITSAmodules.Uploader) {
/*jshint boss:false */
        return Uploader; // Uploader was already created
    }

    Uploader = Classes.createClass(function(config) {
        /**
         * Hidden `input-node` of the type `file` that is being used to transfer the files.
         *
         * @property _inputNode
         * @type DOMNode
         * @private
         * @since 0.0.1
         */

        /**
         * Private Array with objects of this structure: {name: xxx, size: xxx}.
         * Holds the file-info of all files that have been send by the last transfer.
         * Can be used by the method: getLastSent()
         *
         * @property _lastfiles
         * @type Array
         * @default []
         * @private
         * @since 0.0.1
         */

        var instance = this,
            inputNode;
        config || (config={});
        instance._inputNode = inputNode = window.document.body.addSystemElement(TEMPLATE);
        instance.setDefaults(config.url, config.params, config.options);
        instance._lastfiles = [];
        instance.defineEvent('send').defaultFn(instance._defFnSend);
        instance.defineEvent('selectfiles').defaultFn(instance._defFnSelectFiles);
        instance.defineEvent('fileschanged').defaultFn(function(e) {
            var self = e.target;
            self._inputNode.getData('autoSend') && self.send(instance._selectedPayload);
        });
        instance.after('change', function() {
            /**
            * Fired internally whenever the selected files are changed.
            * Its defaultFn will start sending the files (if the selection is triggered with `autoSend=true`)
            *
            * @event uploader:fileschanged
            * @since 0.1
            */
            instance.emit('fileschanged', instance._selectedPayload);
        }, function(e) {
            return (e.target===inputNode);
        });
    },
    {
        /**
         * Clears the default transition-values that are being used for the values of `url`, params` and `options`.
         *
         * @method clearDefaults
         * @chainable
         * @since 0.0.1
        */
        clearDefaults: function() {
            var instance = this;
            instance.defaultURL = null;
            instance.defaultParams = {};
            instance.defaultOptions = {};
            return instance;
        },

        /**
         * Returns the number of files that are currently selected.
         *
         * @method count
         * @return {number} Number of files currently selected
         * @since 0.0.1
        */
        count: function() {
            return this._inputNode.files.length;
        },

        /**
         * Destroys the fileselector: removes all eventlisteners and removes its protected `input`-domNode.
         *
         * @method destroy
         * @since 0.0.1
        */
        destroy: function() {
            this._inputNode.remove();
        },

        /**
         * Returns the protected `input`-domNode whichis being used by this uploader-instance.
         *
         * @method getDomNode
         * @return {DOMNode} protected `input`-domNode
         * @since 0.0.1
        */
        getDomNode: function() {
            return this._inputNode;
        },

        /**
         * Returns the currently selected files. This is an `Array-like` object, not a true Array.
         *
         * @method getFiles
         * @return {Array-like} protected `input`-domNode
         * @since 0.0.1
        */
        getFiles: function() {
            return this._inputNode.files;
        },

        /**
         * Returns the last send-files.
         * This is handy to know, because after transmission, getFiles() will return empty.
         * This is an true Array with objects of this structure: {name: xxx, size: xxx}
         *
         * @method getLastSent
         * @return {Array} The last sent files
         * @since 0.0.1
        */
        getLastSent: function() {
            return this._lastfiles;
        },

        /**
         * Whether there are currently files selected.
         *
         * @method hasFiles
         * @return {number} Number of selected files
         * @since 0.0.1
        */
        hasFiles: function() {
            return (this.count()>0);
        },

        /**
         * Pops-up the browser's fileselect, by emitting the 'uploader:selectfiles'-event.
         * The fileselector allows you to send only 1 file at a time.
         * If `payload.autoSend` is set, the files will automaticly be send after selection.
         * You also can set other properties at the payload --> these will be available at the listeners.
         *
         * @method selectFile
         * @params [payload] {Object}
         *     @params [payload.autoSend] {Boolean}
         * @chainable
         * @since 0.0.1
        */
        selectFile: function(payload) {
            var instance = this;
            instance._selectedPayload = payload ? payload.deepClone() : {};
            /**
            * Fired to start selecting the files.
            * Its defaultFn will pop-up the file-selector.
            *
            * @event uploader:selectfiles
            * @since 0.1
            */
            instance.emit('selectfiles', instance._selectedPayload);
            return instance;
        },

        /**
         * Pops-up the browser's fileselect, by emitting the 'uploader:selectfiles'-event.
         * The fileselector allows you to send multiple files at a time.
         * If `payload.autoSend` is set, the files will automaticly be send after selection.
         * You also can set other properties at the payload --> these will be available at the listeners.
         *
         * @method pluginDOM
         * @params [payload] {Object}
         *     @params [payload.autoSend] {Boolean}
         * @chainable
         * @since 0.0.1
        */
        selectFiles: function(payload) {
            var instance = this;
            instance._selectedPayload = payload ? payload.deepClone() : {};
            instance._selectedPayload.multiple = true;
            instance.emit('selectfiles', instance._selectedPayload);
            return instance;
        },

        /**
         * Send the selected files, by emitting the 'uploader:send'-event.
         * If `payload.url`, `payload.url` or `payload.url` is set, then these will overrule the default
         * values (the way they were set at initiation, or by using `setDefaults`).
         * You also can set other properties at the payload --> these will be available at the listeners.
         *
         * @method pluginDOM
         * @params [payload] {Object}
         *     @params [payload.url] {String}
         *     @params [payload.params] {Object}
         *     @params [payload.options] {Object}
         * @chainable
         * @since 0.0.1
        */
        send: function(payload) {
            var instance = this;
            /**
            * Fired to start uploading through io.
            * Its defaultFn will invoke `sendFiles` of the input-node.
            *
            * @event uploader:send
            * @since 0.1
            */
            instance.emit('send', payload && payload.deepClone());
            return instance;
        },

        /**
         * Sets the default transition-values that are being used for the values of `url`, params` and `options`.
         * These values might have been set during initialization, if so, any values passed will be overrule the previous.
         *
         * @method setDefaults
         * @chainable
         * @since 0.0.1
        */
        setDefaults: function(url, params, options) {
            var instance = this;
            (typeof url==='string') && (instance.defaultURL=url);
            params && (instance.defaultParams=params.deepClone());
            options && (instance.defaultOptions=options.deepClone());
            return instance;
        },

        /**
         * Default function for the `uploader:selectfiles`-event
         *
         * @method _defFnSelectFiles
         * @param e {Object} eventobject
         *     @param [e.multiple] {Boolean} whether to support multiple selected files
         * @private
         * @since 0.0.1
        */
        _defFnSelectFiles: function(e) {
            var instance = e.target,
                inputNode = instance._inputNode,
                autoSend = e.autoSend,
                eMultiple = e.multiple,
                multiple = (typeof eMultiple === 'boolean') ? eMultiple : false;
            inputNode.toggleAttr('multiple', 'true', multiple);
            inputNode.setData('autoSend', autoSend);
            inputNode.showFileSelect();
        },

        /**
         * Default function for the `uploader:send`-event
         *
         * @method _defFnSend
         * @param e {Object} eventobject
         *     @param [e.url] {String} overrules the default `url`
         *     @param [e.params] {Object} overrules the default `params`
         *     @param [e.options] {Object} overrules the default `options`
         * @private
         * @since 0.0.1
        */
        _defFnSend: function(e) {
            var instance = this,
                inputNode = instance._inputNode,
                url = e.url,
                params = e.params,
                options = e.options,
                sendOptions, originalProgressFn;
            if (!inputNode || inputNode.files.length===0) {
                return Promise.reject('no file selected');
            }
            sendOptions = options ? options.deepClone() : instance.defaultOptions.deepClone();
            sendOptions.emptyFiles = true;
            // redefine the argument of the progress-callback:
            if (sendOptions.progressfn) {
                originalProgressFn = sendOptions.progressfn;
                sendOptions.progressfn = function(data) {
                    e.ioPromise = data.target;
                    e.total = data.total;
                    e.loaded = data.loaded;
                    originalProgressFn(e);
                };
            }
            instance._storeLastSent();
            return inputNode.sendFiles(url || instance.defaultURL, params || instance.defaultParams, sendOptions);
        },

        /**
         * Stores the files that are sent into an internal hash, which can be read by `getLastSent()`.
         *
         * @method _storeLastSent
         * @private
         * @chainable
         * @since 0.0.1
        */
        _storeLastSent: function() {
            var instance = this,
                lastFiles = instance._lastfiles,
                files = instance._inputNode.files,
                len = files.length,
                i, file;
            lastFiles.length = 0;
            for (i=0; i<len; i++) {
                file = files[i];
                lastFiles.push({
                    name: file.name,
                    size: file.size
                });
            }
            return instance;
        }
    });

    Uploader.mergePrototypes(Event.Listener);
    Uploader.mergePrototypes(Event.Emitter('uploader'));

    /**
     * Sends the input's files by using an AJAX PUT request.
     * Additional parameters can be through the `params` argument.
     *
     * The Promise gets fulfilled if the server responses with `STATUS-CODE` in the 200-range (excluded 204).
     * It will be rejected if a timeout occurs (see `options.timeout`), or if `xhr.abort()` gets invoked.
     *
     * Note: `params` should be a plain object with only primitive types which are transformed into key/value pairs.
     *
     * @for HTMLInputElement
     * @method sendFiles
     * @param url {String} URL of the resource server
     * @param [params] {Object} additional parameters. NOTE: these will be set as HEADERS like `x-data-parameter` on the request!
     *        should be a plain object with only primitive types which are transformed into key/value pairs.
     * @param [options] {Object}
     *    @param [options.sync=false] {boolean} By default, all requests are sent asynchronously. To send synchronous requests, set to true.
     *    @param [options.headers] {Object} HTTP request headers.
     *    @param [options.timeout=300000] {Number} to timeout the request, leading into a rejected Promise. Defaults to 5 minutes
     *    @param [options.progressfn] {Function} callbackfunction in case you want to process upload-status.
     *           Function has 3 parameters: total, loaded and target (io-promise)
     *    @param [options.withCredentials=false] {boolean} Whether or not to send credentials on the request.
     *    @param [options.parseJSONDate=false] {boolean} Whether the server returns JSON-stringified data which has Date-objects.
     *    @param [options.emptyFiles=true] {boolean} Whether the empty the inputElement after transmitting has completed
     * @return {Promise}
     * on success:
        * Object any received data
     * on failure an Error object
        * reason {Error}
     * The returned promise has an `abort`-method to cancel all transfers.
    */
    window.HTMLInputElement.prototype.sendFiles = function(url, params, options) {
        var instance = this,
            files = instance.files,
            len = files.length,
            hash = [],
            promisesById = {},
            promise, ioPromise, file, i, totalsize, originalProgressFn;
        options || (options={});
        (typeof options.emptyFiles==='boolean') || (options.emptyFiles=true);
        if (len===1) {
            file = files[0];
            promise = IO.sendBlob(url, file, params, options);
        }
        else if (len>1) {
            if (options.progressfn) {
                totalsize = 0;
                originalProgressFn = options.progressfn;
                options.progressfn = function(data) {
                    var promiseInstance = data.target,
                        totalLoaded = 0;
                    promisesById[promiseInstance._id] = data.loaded;
                    promisesById.each(function(value) {
                        totalLoaded += value;
                    });
                    originalProgressFn({
                        total: totalsize,
                        loaded: totalLoaded,
                        target: promise
                    });
                };
            }
            // files is array-like, no true array
            for (i=0; i<len; i++) {
                file = files[i];
                ioPromise = IO.sendBlob(url, file, params, options);
                // we are interested in the total size of ALL files
                if (options.progressfn) {
                    totalsize += file.size;
                    ioPromise._id = i;
                }
                hash.push(ioPromise);
            }
            promise = window.Promise.finishAll(hash).then(function(response) {
                var rejected = response.rejected;
                rejected.forEach(function(ioError) {
                    if (ioError) {
                        throw new Error(ioError);
                    }
                });
            });
            promise.abort = function() {
                hash.forEach(function(ioPromise) {
                    ioPromise.abort();
                });
            };
        }
        else {
            promise = Promise.reject('No files selected');
        }
        if (options.emptyFiles && (len>0)) {
            // empty ON THE NEXT stack (not microstack), to ensure all previous methods are processing
            later(function () {
                instance.resetFileSelect();
            }, 0);
        }
        return promise;
    };

    window._ITSAmodules.Uploader = Uploader;

    return Uploader;
};