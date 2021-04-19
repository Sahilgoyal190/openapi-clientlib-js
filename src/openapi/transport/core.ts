/**
 * @module saxo/openapi/transport/core
 * @ignore
 */

import { formatUrl } from '../../utils/string';
import fetch from '../../utils/fetch';
import { getRequestId } from '../../utils/request';
import { shouldUseCloud } from './options';
import type {
    Options,
    TransportCoreOptions,
    Services,
    HTTPMethods,
} from './types';
import TransportBase from './trasportBase';

/**
 * Options pertaining to a specific service path.
 *
 * @typedef {Object} saxo.ServiceOptions
 * @property {boolean|function} [useCloud] - Request from OpenAPI cloud (/oapi)
 */

/**
 * Handles core transport to the openapi rest service. This is little more than a thin layer on top of fetch, adding
 * cache breaking, language header adding and a convenient mechanism for making transport calls.
 * @class
 * @alias saxo.openapi.TransportCore
 * @param {string} baseUrl - The base url used for all open api requests. This should be an absolute URL.
 * @param {object} [options]
 * @param {string} [options.language] - The language sent as a header if not overridden.
 * @param {boolean} [options.defaultCache=true] - Sets the default caching behaviour if not overridden on a call.
 * @param {Object.<string, saxo.ServiceOptions>} [options.services] - Per-service options, keyed by service path.
 */

class TransportCore extends TransportBase {
    baseUrl: string;
    language?: string;
    services: Services = {};
    defaultCache = true;
    useXHttpMethodOverride = false;

    constructor(baseUrl?: string | null, options?: Options) {
        super();
        if (!baseUrl) {
            throw new Error('Missing required parameter: baseUrl');
        }
        this.baseUrl = baseUrl;
        this.language = options?.language;
        if (options && typeof options.defaultCache === 'boolean') {
            this.defaultCache = options.defaultCache;
        }

        this.services = options?.services || {};
    }

    prepareTransportMethod(method: HTTPMethods) {
        return (
            servicePath?: string,
            urlTemplate?: string,
            templateArgs?: Record<string, string | number> | null,
            options?: TransportCoreOptions,
        ) => {
            let body;
            let headers: Record<string, string> = {};
            let cache = this.defaultCache;
            let queryParams;

            if (!servicePath || !urlTemplate) {
                throw new Error(
                    'Transport calls require a service path and a URL',
                );
            }

            if (options) {
                if (options.headers) {
                    headers = options.headers;
                }
                body = options.body;
                if (typeof options.cache === 'boolean') {
                    cache = options.cache;
                }

                queryParams = options.queryParams;
            }

            const url = formatUrl(urlTemplate, templateArgs, queryParams);

            if (this.language) {
                if (!headers['Accept-Language']) {
                    headers['Accept-Language'] = this.language + ', *;q=0.5';
                }
            }

            if (!headers['X-Request-Id']) {
                // making toString as headers accept string types in values
                headers['X-Request-Id'] =
                    (options && options.requestId) || getRequestId().toString();
            }

            const basePath = shouldUseCloud(this.services[servicePath])
                ? '/oapi'
                : '/openapi';

            return this.fetch(
                method,
                this.baseUrl + basePath + '/' + servicePath + '/' + url,
                {
                    body,
                    headers,
                    cache,
                    useXHttpMethodOverride: this.useXHttpMethodOverride,
                },
            );
        };
    }

    // fix-me move comment to either base class or better place where they make more sense

    /**
     * Does a get request against open api.
     * @function
     * @param {string} servicePath - The service path to make the call on
     * @param {string} urlTemplate - The url path template which follows on from the service path to describe the path for the request.
     * @param {Object} templateArgs - An object containing fields matched to the template or null if there are no templateArgs.
     * @param {Object} [options]
     * @param {Object.<string:string>} [options.headers] - A object map of headers, header key to header value
     * @param {boolean} [options.cache] - Override the default cache setting for this call.
     *                         If cache is false then a cache control "nocache" header will be added.
     *                         If cache is false and the method is get then a cache breaker will be added to the url.
     * @param {Object.<string:string>} [options.queryParams] - An object map of query params which will be added to
     *                        the URL.
     * @returns {Promise} - A promise which will be resolved when a 2xx response is received, otherwise it will be failed.
     *                       The result in the case of success will be an object with a status (number) and a response property
     *                       which will be an object if the call returned with json, otherwise it will be text.
     *                       In the case of failure, there may be no result or there may be a result with a status or
     *                       there may be a result with status and a response, depending on what went wrong.
     * @example
     * // The call
     * var promise = transport.get("root", "path/to/{accountKey}", { accountKey: "123" }, {
     *                         headers: { "my-header": "header-value" },
     *                         cache: false,
     *                        queryParams: {a: b}});
     *
     * // makes a call to path/to/123?a=b
     * // success
     * promise.then(function(result) {
     *         console.log("The status is " + Number(result.status));
     *         console.log("My result is ...");
     *        console.dir(result.response);
     * });
     *
     * // failure
     * promise.catch(function(result) {
     *         if (result) {
     *             if (result.status) {
     *                 console.log("a call was made but returned status " + Number(result.status));
     *                 if (result.response) {
     *                     console.log("Open API's response was...");
     *                     console.dir(result.response);
     *                 }
     *             } else {
     *                 console.log("result could be an exception");
     *             }
     *         } else {
     *             console.log("an unknown error occurred");
     *         }
     * });
     */

    /**
     * Does a put request against open api.
     * @function
     * @param {string} servicePath - The service path to make the call on
     * @param {string} urlTemplate - The url path template which follows on from the service path to describe the path for the request.
     * @param {Object} templateArgs - An object containing fields matched to the template or null if there are no templateArgs.
     * @param {Object} [options]
     * @param {Object.<string:string>} [options.headers] - A object map of headers, header key to header value
     * @param {Object|string} [options.body] - The body to send in the request. If it is an object it will be json.stringified.
     * @param {boolean} [options.cache] - Override the default cache setting for this call.
     *                         If cache is false then a cache control "nocache" header will be added.
     *                         If cache is false and the method is get then a cache breaker will be added to the url.
     * @param {Object.<string:string>} [options.queryParams] - An object map of query params which will be added to
     *                        the URL.
     * @returns {Promise} - A promise which will be resolved when a 2xx response is received, otherwise it will be failed.
     *                       The result in the case of success will be an object with a status (number) and a response property
     *                       which will be an object if the call returned with json, otherwise it will be text.
     *                       In the case of failure, there may be no result or there may be a result with a status or
     *                       there may be a result with status and a response, depending on what went wrong.
     * @example
     * // The call
     * var promise = transport.put("root", "path/to/{accountKey}", { accountKey: "123" }, {
     *                         headers: { "my-header": "header-value" },
     *                         body: { "thing": "to-put" },
     *                         cache: false,
     *                        queryParams: {a: b}});
     *
     * // makes a call to path/to/123?a=b
     * // success
     * promise.then(function(result) {
     *         console.log("The status is " + Number(result.status));
     *         console.log("My result is ...");
     *        console.dir(result.response);
     * });
     *
     * // failure
     * promise.catch(function(result) {
     *         if (result) {
     *             if (result.status) {
     *                 console.log("a call was made but returned status " + Number(result.status));
     *                 if (result.response) {
     *                     console.log("Open API's response was...");
     *                     console.dir(result.response);
     *                 }
     *             } else {
     *                 console.log("result could be an exception");
     *             }
     *         } else {
     *             console.log("an unknown error occurred");
     *         }
     * });
     */

    /**
     * Does a delete request against open api.
     * @function
     * @param {string} servicePath - The service path to make the call on
     * @param {string} urlTemplate - The url path template which follows on from the service path to describe the path for the request.
     * @param {Object} templateArgs - An object containing fields matched to the template or null if there are no templateArgs.
     * @param {Object} [options]
     * @param {Object.<string:string>} [options.headers] - A object map of headers, header key to header value
     * @param {boolean} [options.cache] - Override the default cache setting for this call.
     *                         If cache is false then a cache control "nocache" header will be added.
     *                         If cache is false and the method is get then a cache breaker will be added to the url.
     * @param {Object.<string:string>} [options.queryParams] - An object map of query params which will be added to
     *                        the URL.
     * @returns {Promise} - A promise which will be resolved when a 2xx response is received, otherwise it will be failed.
     *                       The result in the case of success will be an object with a status (number) and a response property
     *                       which will be an object if the call returned with json, otherwise it will be text.
     *                       In the case of failure, there may be no result or there may be a result with a status or
     *                       there may be a result with status and a response, depending on what went wrong.
     * @example
     * // The call
     * var promise = transport.delete("root", "path/to/{accountKey}", { accountKey: "123" }, {
     *                         headers: { "my-header": "header-value" },
     *                         cache: false,
     *                        queryParams: {a: b}});
     *
     * // makes a call to path/to/123?a=b
     * // success
     * promise.then(function(result) {
     *         console.log("The status is " + Number(result.status));
     *         console.log("My result is ...");
     *        console.dir(result.response);
     * });
     *
     * // failure
     * promise.catch(function(result) {
     *         if (result) {
     *             if (result.status) {
     *                 console.log("a call was made but returned status " + Number(result.status));
     *                 if (result.response) {
     *                     console.log("Open API's response was...");
     *                     console.dir(result.response);
     *                 }
     *             } else {
     *                 console.log("result could be an exception");
     *             }
     *         } else {
     *             console.log("an unknown error occurred");
     *         }
     * });
     */

    /**
     * Does a post request against open api.
     * @function
     * @param {string} servicePath - The service path to make the call on
     * @param {string} urlTemplate - The url path template which follows on from the service path to describe the path for the request.
     * @param {Object} templateArgs - An object containing fields matched to the template or null if there are no templateArgs.
     * @param {Object} [options]
     * @param {Object.<string:string>} [options.headers] - A object map of headers, header key to header value
     * @param {Object|string} [options.body] - The body to send in the request. If it is an object it will be json.stringified.
     * @param {boolean} [options.cache] - Override the default cache setting for this call.
     *                         If cache is false then a cache control "nocache" header will be added.
     *                         If cache is false and the method is get then a cache breaker will be added to the url.
     * @param {Object.<string:string>} [options.queryParams] - An object map of query params which will be added to
     *                        the URL.
     * @returns {Promise} - A promise which will be resolved when a 2xx response is received, otherwise it will be failed.
     *                       The result in the case of success will be an object with a status (number) and a response property
     *                       which will be an object if the call returned with json, otherwise it will be text.
     *                       In the case of failure, there may be no result or there may be a result with a status or
     *                       there may be a result with status and a response, depending on what went wrong.
     * @example
     * // The call
     * var promise = transport.post("root", "path/to/{accountKey}", { accountKey: "123" }, {
     *                         headers: { "my-header": "header-value" },
     *                         body: { "thing": "to-post" },
     *                         cache: false,
     *                        queryParams: {a: b}});
     *
     * // makes a call to path/to/123?a=b
     * // success
     * promise.then(function(result) {
     *         console.log("The status is " + Number(result.status));
     *         console.log("My result is ...");
     *        console.dir(result.response);
     * });
     *
     * // failure
     * promise.catch(function(result) {
     *         if (result) {
     *             if (result.status) {
     *                 console.log("a call was made but returned status " + Number(result.status));
     *                 if (result.response) {
     *                     console.log("Open API's response was...");
     *                     console.dir(result.response);
     *                 }
     *             } else {
     *                 console.log("result could be an exception");
     *             }
     *         } else {
     *             console.log("an unknown error occurred");
     *         }
     * });
     */

    /**
     * Does a patch request against open api.
     * @function
     * @param {string} servicePath - The service path to make the call on
     * @param {string} urlTemplate - The url path template which follows on from the service path to describe the path for the request.
     * @param {Object} templateArgs - An object containing fields matched to the template or null if there are no templateArgs.
     * @param {Object} [options]
     * @param {Object.<string:string>} [options.headers] - A object map of headers, header key to header value
     * @param {Object|string} [options.body] - The body to send in the request. If it is an object it will be json.stringified.
     * @param {boolean} [options.cache] - Override the default cache setting for this call.
     *                         If cache is false then a cache control "nocache" header will be added.
     *                         If cache is false and the method is get then a cache breaker will be added to the url.
     * @param {Object.<string:string>} [options.queryParams] - An object map of query params which will be added to
     *                        the URL.
     * @returns {Promise}  - A promise which will be resolved when a 2xx response is received, otherwise it will be failed.
     *                       The result in the case of success will be an object with a status (number) and a response property
     *                       which will be an object if the call returned with json, otherwise it will be text.
     *                       In the case of failure, there may be no result or there may be a result with a status or
     *                       there may be a result with status and a response, depending on what went wrong.
     * @example
     * // The call
     * var promise = transport.patch("root", "path/to/{accountKey}", { accountKey: "123" }, {
     *                         headers: { "my-header": "header-value" },
     *                         body: { "thing": "to-patch" },
     *                         cache: false,
     *                        queryParams: {a: b}});
     *
     * // makes a call to path/to/123?a=b
     * // success
     * promise.then(function(result) {
     *         console.log("The status is " + Number(result.status));
     *         console.log("My result is ...");
     *        console.dir(result.response);
     * });
     *
     * // failure
     * promise.catch(function(result) {
     *         if (result) {
     *             if (result.status) {
     *                 console.log("a call was made but returned status " + Number(result.status));
     *                 if (result.response) {
     *                     console.log("Open API's response was...");
     *                     console.dir(result.response);
     *                 }
     *             } else {
     *                 console.log("result could be an exception");
     *             }
     *         } else {
     *             console.log("an unknown error occurred");
     *         }
     * });
     */

    /**
     * Does a head request against open api.
     * @function
     * @param {string} servicePath - The service path to make the call on
     * @param {string} urlTemplate - The url path template which follows on from the service path to describe the path for the request.
     * @param {Object} templateArgs - An object containing fields matched to the template or null if there are no templateArgs.
     * @param {Object} [options]
     * @param {Object.<string:string>} [options.headers] - A object map of headers, header key to header value
     * @param {Object|string} [options.body] - The body to send in the request. If it is an object it will be json.stringified.
     * @param {boolean} [options.cache] - Override the default cache setting for this call.
     *                         If cache is false then a cache control "nocache" header will be added.
     *                         If cache is false and the method is get then a cache breaker will be added to the url.
     * @param {Object.<string:string>} [options.queryParams] - An object map of query params which will be added to
     *                        the URL.
     * @returns {Promise}  - A promise which will be resolved when a 2xx response is received, otherwise it will be failed.
     *                       The result in the case of success will be an object with a status (number) and a response property
     *                       which will be an object if the call returned with json, otherwise it will be text.
     *                       In the case of failure, there may be no result or there may be a result with a status or
     *                       there may be a result with status and a response, depending on what went wrong.
     * @example
     * // The call
     * var promise = transport.head("root", "path/to/{accountKey}", { accountKey: "123" }, {
     *                         headers: { "my-header": "header-value" },
     *                         cache: false,
     *                        queryParams: {a: b}});
     *
     * // makes a call to path/to/123?a=b
     * // success
     * promise.then(function(result) {
     *         console.log("The status is " + Number(result.status));
     *         console.log("My result is ...");
     *        console.dir(result.response);
     * });
     *
     * // failure
     * promise.catch(function(result) {
     *         if (result) {
     *             if (result.status) {
     *                 console.log("a call was made but returned status " + Number(result.status));
     *                 if (result.response) {
     *                     console.log("Open API's response was...");
     *                     console.dir(result.response);
     *                 }
     *             } else {
     *                 console.log("result could be an exception");
     *             }
     *         } else {
     *             console.log("an unknown error occurred");
     *         }
     * });
     */

    /**
     * Does an options request against open api.
     * @function
     * @param {string} servicePath - The service path to make the call on
     * @param {string} urlTemplate - The url path template which follows on from the service path to describe the path for the request.
     * @param {Object} templateArgs - An object containing fields matched to the template or null if there are no templateArgs.
     * @param {Object} [options]
     * @param {Object.<string:string>} [options.headers] - A object map of headers, header key to header value
     * @param {Object|string} [options.body] - The body to send in the request. If it is an object it will be json.stringified.
     * @param {boolean} [options.cache] - Override the default cache setting for this call.
     *                         If cache is false then a cache control "nocache" header will be added.
     *                         If cache is false and the method is get then a cache breaker will be added to the url.
     * @param {Object.<string:string>} [options.queryParams] - An object map of query params which will be added to
     *                        the URL.
     * @returns {Promise}  - A promise which will be resolved when a 2xx response is received, otherwise it will be failed.
     *                       The result in the case of success will be an object with a status (number) and a response property
     *                       which will be an object if the call returned with json, otherwise it will be text.
     *                       In the case of failure, there may be no result or there may be a result with a status or
     *                       there may be a result with status and a response, depending on what went wrong.
     * @example
     * // The call
     * var promise = transport.options("root", "path/to/{accountKey}", { accountKey: "123" }, {
     *                         headers: { "my-header": "header-value" },
     *                         cache: false,
     *                        queryParams: {a: b}});
     *
     * // makes a call to path/to/123?a=b
     * // success
     * promise.then(function(result) {
     *         console.log("The status is " + Number(result.status));
     *         console.log("My result is ...");
     *        console.dir(result.response);
     * });
     *
     * // failure
     * promise.catch(function(result) {
     *         if (result) {
     *             if (result.status) {
     *                 console.log("a call was made but returned status " + Number(result.status));
     *                 if (result.response) {
     *                     console.log("Open API's response was...");
     *                     console.dir(result.response);
     *                 }
     *             } else {
     *                 console.log("result could be an exception");
     *             }
     *         } else {
     *             console.log("an unknown error occurred");
     *         }
     * });
     */

    /**
     * Sets whether to replace put/patch/delete calls with a post that has
     * a X-HTTP-Method-Override header
     * @param {boolean} useXHttpMethodOverride
     */
    setUseXHttpMethodOverride(useXHttpMethodOverride: boolean) {
        this.useXHttpMethodOverride = useXHttpMethodOverride;
    }

    fetch = fetch;

    dispose() {}
}

// -- Export section --

export default TransportCore;