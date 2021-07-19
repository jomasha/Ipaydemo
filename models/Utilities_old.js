var fs = require('fs');
var SysConfig = require('./SysConfig.js');
var sys_config = SysConfig.sysConfig();//JSON.parse(fs.readFileSync('config/sys_config.json'));
var pool = SysConfig.dbConnection();
var async = require('async');
var QueryBuilder = require('datatable-gn');
var _u = require('underscore');
var moment = require('moment');
var request = require('request');

//
    function Utilities() {
        this.baseUrl = sys_config.application.base_url;
        this.tableName;
        this.fieldName;
        this.stringToCheck;
        this.extraWhere = "";
    }

Utilities.prototype = {

    /**
     * Return database object // Reduce recalling the object where this class is called
     */
    dbo: pool,
    /**
     * Returns all system configurations in the config file
     */
    sysConfig: sys_config,
    /**
     * Returns the underscore object for various javascript functionalities
     */
    _u: _u,
    /**
     * moment object
     */
    moment: moment,
    /**
     * Used to check if a record exist in a database
     * @param tableName
     * @param fieldName
     * @param stringToCheck
     * @param getResponse
     */
    checkIfExists: function (tableName, fieldName, stringToCheck, getResponse) {
        let _O = this;
        let tableArr = tableName.split(",");
        let checkSum = 0;
        let data = [];
        let table_found = "";
        //
        async.each(tableArr, function (table, callback) {
            _O.checkIfExistsHelper(table, fieldName, stringToCheck, function (result, result2) {
                checkSum += result;
                data = (result2 !== undefined && !_O._u.isEmpty(result2) && result == 1) ? result2 : data;
                table_found = (result2 !== undefined && !_O._u.isEmpty(result2) && result == 1) ? table : table_found;
                callback();
            });
        }, function (err, result) {
            if (err)
                getResponse(err);
            getResponse(checkSum, data, table_found);
        });
    },

    checkIfExistsHelper: function (tableName, fieldName, stringToCheck, getResponse) {
        //
        var extraWhere = this.extraWhere;
        var values = [stringToCheck];
        //
        pool.getConnection(function (err, connection) {
            if (err) {
                getResponse("Connection : " + err);
            } else {
                var query = "SELECT * FROM `" + tableName + "` WHERE (`" + fieldName + "`= ? " + extraWhere + ") AND `publish` = 1 LIMIT 1";
                connection.query(query, values, function (err, result) {
                    connection.release();
                    // console.log(query,err,result);
                    if (err) {
                        getResponse("Fetch data : " + err);
                    } else {
                        if (result instanceof Array && result.length === 0) {
                            getResponse(0);
                        } else {
                            getResponse(1, result);
                        }
                    }
                });
            }
        });
    },
    /**
     * Method formats data to nice json objects for display in the UI
     * @param lang
     * @param input
     * @param data
     * @param mtype
     * @returns {*{}}
     */
    getMessage: function (lang, input, data, mtype) {
        //
        var message = "";
        var title = "";
        var type = mtype;
        var extraData = data;
        //
        var int;
        var value;

        if (input instanceof Object) {
            type = "result" in input ? input.result : "error";
            title = "result" in input ? input.result : "Error";
            var messageArr;
            if ("message" in input) {
                messageArr = input.message;
                if (messageArr instanceof Object) {
                    int = 1;
                    message = "<ul>";
                    for (value in messageArr) {
                        message += "<li>" + messageArr[value] + "</li>";
                        int++;
                    }
                    message += "</ul>"

                } else {
                    message = "<ul><li>" + messageArr + "</li></ul>";
                }
            }

            if ("data" in input) {
                extraData = input.data;
            }

        } else {
            if (input == 1) {
                type = "success";
                message = "Operation completed successfully";
                title = "Success";
            } else if (input == 2) {
                type = "error";
                message = "Record already exists";
                title = "Failed";
            } else if (input == 3) {
                type = "error";
                message = "Module parameter misconfiguration";
                title = "Failed";
            } else if (input == 4) {
                type = "error";
                message = "Requested resource is not accessible";
                title = "Failed";
            } else if (input == 5) {
                type = "error";
                message = "Try again please!";
                title = "Failed";
            } else if (input == 6) {
                type = "error";
                message = "Access to gateway denied!";
                title = "Failed";
            } else {
                message = input;
            }

        }

        //noinspection UnnecessaryLocalVariableJS
        var message_object = {type: type, title: title, message: message, data: extraData};

        return message_object;
    },
    /**
     * load data for datatables helper
     * @param req
     * @param tableDefinition
     * @param getResponse
     */
    tableLoader: function (req, tableDefinition, getResponse) {
        var queryBuilder = new QueryBuilder(tableDefinition);
        // Build an object of SQL statements
        var queries = queryBuilder.buildQuery(req, tableDefinition);
        // Connect to the database
        var myDbObject = pool;
        // Execute the SQL statements generated by queryBuilder.buildQuery
        // console.log(queries);
        //

        async.parallel(
            {
                recordsFiltered: function (cb) {
                    myDbObject.query(queries.recordsFiltered, cb);
                },
                recordsTotal: function (cb) {
                    myDbObject.query(queries.recordsTotal, cb);
                },
                select: function (cb) {
                    // console.log(queries);
                    myDbObject.query(queries.select, cb);
                }
            },
            function (err, results) {
                if (err) {
                    getResponse(err);
                } else {
                    getResponse(queryBuilder.parseResponse(results));
                }
            }
        );

    },
    /**
     * get files recursively in directory
     * @param dir
     * @param done
     */
    getFiles: function (dir, done) {
        var results = [];
        fs.readdir(dir, function (err, list) {
            if (err) return done(err);
            var pending = list.length;
            if (!pending) return done(null, results);
            list.forEach(function (file) {
                file = file;
                fs.stat(file, function (err, stat) {
                    if (stat && stat.isDirectory()) {
                        walk(file, function (err, res) {
                            results = results.concat(res);
                            if (!--pending) done(null, results);
                        });
                    } else {
                        results.push(file);
                        if (!--pending) done(null, results);
                    }
                });
            });
        });
    },
    /**
     * Where clause for filtering data according to users roles
     * @param req
     * @param tableName
     * @param orgIdDbName
     * @param userIdDbName
     * @param groupColumn
     * @param groupTable
     * @param getResponse
     * @returns {string}
     */
    dynamicDataAccessWhereClause: function (req, tableName, orgIdDbName, userIdDbName, groupColumn, groupTable, getResponse) {

        //
        let _O = this;
        //
        let where = "0";
        let access_type = (req.query.access_type) ? req.query.access_type : req.session.ACCESS_TYPE;
        let user_id = (req.query.user_id) ? req.query.user_id : req.session.USER_ID;
        let organization_id = (req.query.organization_id) ? req.query.organization_id : req.session.ORG_ID;
        let ra_id = (req.query.ra_id) ? req.query.ra_id : req.session.RA_ID;
        let linked_user_id = (req.query.linked_user_id) ? req.query.linked_user_id : req.session.LINKED_USER_ID;
        //
        if (access_type == 0) {//restricted to own items
            where = tableName + "." + userIdDbName + " = " + user_id;
        } else if (access_type == 1) {//organizational access
            where = tableName + "." + orgIdDbName + "=" + organization_id;
        } else if (access_type == 2) {//access for RA users
            where = tableName + ".RA_ID = " + ra_id;
        } else if (access_type == 3) {//general access for super admins
            where = "1";
        }
        //
        ////injecting cheats, somethign awesome is happening
        let filter = _O.tryParseJSON(req.query.filter, true);
        if (filter instanceof Object) {
            if (filter.filter == "organization") {
                where = tableName + "." + orgIdDbName + "=" + filter.id;
            }
        }
        //
        //
        try {
            _O.dynamicDataAccessWhereClauseGroupHelper(req, where, tableName, orgIdDbName, "party", function (resultOrg, resultArrayOrg, resultOrgCheck) {
                _O.dynamicDataAccessWhereClauseGroupHelper(req, where, tableName, groupColumn, groupTable, function (result, resultArray, resultCheck) {
                    // console.log(resultOrg,resultOrgCheck,resultArrayOrg,result,resultCheck, resultArray);
                    let final_clause = (resultOrgCheck == true && !_O._u.isEmpty(resultArrayOrg)) ? resultOrg : result;
                    final_clause = ('table_primary_key' in req) ? "(" + final_clause + " OR " + tableName + "." + req.table_primary_key + " = " + user_id + " OR " + tableName + "." + req.table_primary_key + " = " + linked_user_id + ")" : final_clause;
                    getResponse(final_clause);
                });
            });
        } catch (e) {
            console.log(e);
            getResponse(e);
        }
    },

    /**
     *
     * @param req
     * @param whereClause
     * @param tableName
     * @param groupColumn
     * @param groupTable
     * @param getResponse
     */

    dynamicDataAccessWhereClauseGroupHelper: function (req, whereClause, tableName, groupColumn, groupTable, getResponse) {
        let _O = this;
        //
        //
        let user_groups = (req.query.user_groups) ? req.query.user_groups : req.session.USER_GROUPS;
        let user_type = (req.query.user_type) ? req.query.user_type : req.session.USER_TYPE;
        let linked_user_id = (req.query.linked_user_id) ? req.query.linked_user_id : req.session.LINKED_USER_ID;
        let linked_user_table_name = (req.query.linked_user_id_module) ? req.query.linked_user_id_module : req.session.LINKED_USER_TABLE_NAME;
        //
        // console.log(user_type,linked_user_table_name,req.session);
        //
        if (user_type == "1" && groupColumn != "") {
            let needed_ids = "";
            _O.dynamicDataAccessWhereClauseGroupHelperHelper(_O.implodeAssoc(_O.tryParseJSON(user_groups), "id"), groupTable, function (result) {
                result.forEach(function (entry) {
                    needed_ids += _O.implodeAssoc(_O.tryParseJSON(entry['ITEMS']), "id") + ",";
                });

                whereClause = "FIND_IN_SET(`" + tableName + "`.`" + groupColumn + "`,'" + needed_ids.substring(0, needed_ids.length - 1) + "')";
                getResponse(whereClause, result, true);
            });
        } else if (user_type == 2) {
            //we shall make you dynamic later (linked users are users created from data already entered in other tables.)
            //but for now we hijack the where .....
            if (linked_user_table_name == 'driver') {
                whereClause = tableName + ".DRIVER_ID = " + linked_user_id;
            }
            //
            getResponse(whereClause, [], false)
        } else {
            getResponse(whereClause, [], false)
        }
    },

    dynamicDataAccessWhereClauseGroupHelperHelper: function (ids, mdtable, getResponse) {
        let values = [ids, mdtable];
        this.dbo.getConnection(function (err, connection) {
            if (err) {
                getResponse("Connection : " + err);
            } else {
                connection.query("SELECT * FROM `user_groups` WHERE FIND_IN_SET(`ID`,?) AND `MODULE_TABLE` = ?", values, function (err, result) {
                    connection.release();
                    if (err) {
                        getResponse("Fetch data : " + err);
                    } else {
                        getResponse(result);
                    }
                });
            }
        });
    },
    /**
     * Get language variables
     * @param req
     * @param moduleName
     * @param emptyObjectIfFail
     */
    getLanguageVariables: function (req, moduleName, emptyObjectIfFail = false) {
        var objUtils = this;
        var cookieObj = req.cookies;
        var data = {};
        var folderName = "";
        if ("LANG" in cookieObj) {
            folderName = cookieObj.LANG;
        } else {

            folderName = "EN";
        }
        try {
            data = JSON.parse(fs.readFileSync('config/lang/' + folderName + "/" + moduleName + ".json"));
        } catch (err) {
            data = emptyObjectIfFail ? {} : objUtils.getMessage("", err, err);
        }
        return data;
    },
    /**
     * Formay number to shorter versions
     * @param num
     * @param digits
     * @returns {string}
     */
    nFormatter: function (num, digits) {
        var si = [
            {value: 1E18, symbol: "E"},
            {value: 1E15, symbol: "P"},
            {value: 1E12, symbol: "T"},
            {value: 1E9, symbol: "G"},
            {value: 1E6, symbol: "M"},
            {value: 1E3, symbol: "k"}
        ], rx = /\.0+$|(\.[0-9]*[1-9])0+$/, i;
        for (i = 0; i < si.length; i++) {
            if (num >= si[i].value) {
                return (num / si[i].value).toFixed(digits).replace(rx, "$1") + si[i].symbol;
            }
        }
        return num.toFixed(digits).replace(rx, "$1");
    },
    /**
     * This method is used to return a string which is used for getting the right database table for largely data
     * yearly,quarterly,monthly,weekly,daily
     * @param date
     * @return {string}
     */
    getDBNameSetByDate: function (date) {

        var current_date = moment(new Date()).format("YYYY-MM-DD");
        var oncheck_date = (moment(date, 'YYYY-MM-DD HH:mm:ss', true).isValid() == true || moment(date, 'YYYY-MM-DD', true).isValid() == true) ? moment(date).format("YYYY-MM-DD") : moment(new Date()).format("YYYY-MM-DD");
        var range = "yearly";

        if (moment(oncheck_date).isSame(current_date, 'day') == true) {
            range = "daily";
        } else if (moment(oncheck_date).isSame(current_date, 'week') == true) {
            range = "weekly";
        } else if (moment(oncheck_date).isSame(current_date, 'month') == true) {
            range = "monthly";
        } else if (moment(oncheck_date).isSame(current_date, 'quarter') == true) {
            range = "yearly";
        } else if (moment(oncheck_date).isSame(current_date, 'year') == true) {
            range = "yearly";
        }

        return range;
    },
    /**
     * parse a json string to a jsonObject
     * @param jsonString
     * @param returnStringIfFails
     * @returns {*}
     */
    tryParseJSON: function (jsonString, returnStringIfFails) {
        try {
            if (!(jsonString instanceof Object)) {
                var o = JSON.parse(jsonString);
            } else {
                var o = jsonString;
            }

            // Handle non-exception-throwing cases:
            // Neither JSON.parse(false) or JSON.parse(1234) throw errors, hence the type-checking,
            // but... JSON.parse(null) returns null, and typeof null === "object",
            // so we must check for that, too. Thankfully, null is falsey, so this suffices:
            if (o && typeof o === "object") {
                return o;
            }
        } catch (e) {
            //console.log(e);
        }

        if (returnStringIfFails === true) {
            return jsonString;
        } else {
            return [];
        }
    },
    /**
     * Merge associative arrays
     * @param array1
     * @param array2
     * @param unique
     * @returns {*}
     */
    mergeAssocArrays: function (array1, array2, unique) {
        var _O = this;
        for (var i = 0; i < array2.length; i++) {
            var value1 = array2[i];
            var value1_exists = _O._u.find(array1, function (item) {
                return item[unique] === value1[unique];
            });
            if (!value1_exists) {
                array1.push(value1);
            }
        }
        return array1;
    },
    /**
     * Reverse geocode coordinates
     * @param lat
     * @param lon
     * @param getResponse
     */
    getLocationFromCoordinates: function (lat, lon, getResponse) {
        var _O = this;
        var location = "";
        let url_path = sys_config.application.reverse_geocode_url;
        // let url_path_params =  "?format=json&json_callback=renderExampleThreeResults&lat=" + lat + "&lon=" + lon;
        let url_path_params = "?format=json&lat=" + lat + "&lon=" + lon + "&zoom=16";
        // console.log(url_path+url_path_params);
        try {
            _O.urlCaller("", url_path, url_path_params, function (result) {
                // console.log(result);
                if (result === false) {
                    getResponse("");
                } else {
                    try {
                        var received = result.replace("renderExampleThreeResults(", "");
                        received = received.replace(")", "");
                        var receive_obj = _O.tryParseJSON(received);
                        if ("display_name" in receive_obj) {
                            getResponse(receive_obj['display_name']);
                        } else {
                            getResponse("");
                        }
                    } catch (err) {
                        getResponse("");
                    }
                }
            });
        } catch (e) {
            console.log(e);
            getResponse("");
        }
    },
    /**
     * Create a comma separated string from an associative array
     * @param array
     * @param key
     * @param is_string
     * @returns {*}
     */
    implodeAssoc: function (array, key, is_string = false) {
        var _O = this;
        var string = "";
        try {
            array = _O.tryParseJSON(array);
            if (array instanceof Object) {
                array.forEach(function (item) {
                    let item_name = (is_string) ? "'" + item[key] + "'" : item[key];
                    string += item_name + ",";
                });
                //
                return string.substring(0, string.length - 1);
            } else {
                return array;
            }
        } catch (e) {
            return "";
        }
    },
    /**
     *
     * @param type 1 : post , default : get
     * @param url
     * @param params
     * @param getResponse
     */
    urlCaller: function (type, url, params, getResponse) {
        switch (type) {
            case 1:
                request.post({url: url, form: params}, function (err, httpResponse, body) {
                    if (err) {
                        // console.log(err,url,params);
                        getResponse(false);
                    } else {
                        getResponse(body)
                    }
                });
                break;
            default:
                request.get({url: url + params}, function (err, httpResponse, body) {
                    if (err) {
                        // console.log(err,url,params);
                        getResponse(false);
                    } else {
                        getResponse(body)
                    }
                });
                break
        }
    },
    /**
     * convert logos  --- by getting urls
     */
    getApplicationName: function (req) {
        let url = req.get('host');
        let application_name = "Navisat - ECTS";
        let url_arr = url.split(".");
        let logo_path = "/images/default_logo.png";
        let logo_inner = "/images/default_logo_index.png";
        let app_company = "navisat";
        //
        switch (url_arr[0]) {
            case 'rw-vtrade':
                application_name = "Rwanda - CVTFS";
                logo_path = "/images/rra_login_header.png";
                logo_inner = "/images/rwCurve.png";
                app_company = "comesa";
                break;
            case 'drc-vtrade':
                application_name = "DRC - CVTFS";
                logo_path = "/images/br_login_header.png";
                logo_inner = "/images/drcCurve.png";
                app_company = "comesa";
                break;
            case 'mw-vtrade':
                application_name = "Malawi - CVTFS";
                logo_path = "/images/mw_login_header.png";
                logo_inner = "/images/mraCurve.png";
                app_company = "comesa";
                break;
            case 'zm-vtrade':
                application_name = "Zambia - CVTFS";
                logo_path = "/images/zra_login_header.png";
                logo_inner = "/images/zraCurve.png";
                app_company = "comesa";
                break;
            case 'southsudan':
                application_name = "South Sudan - ECTS";
                logo_path = "/images/ss_login_header.png";
                logo_inner = "/images/ssCurve.png";
                app_company = "southsudan";
                break;
            default:
                break;
        }
        //
        switch (url_arr[1]) {
            case 'milestracking':
                application_name = "Miles - Tracking - Ects";
                logo_path = "/images/mt_default_logo.png";
                logo_inner = "/images/mt_logo_index.png";
                app_company = "milestracking";
                break;
            default:
                break;
        }
        //
        return {
            'application_name': application_name,
            "logo_path": logo_path,
            "logo_inner": logo_inner,
            "app_company": app_company
        };
    },

    sanitizePhoneNumber: function (country_code, phone_number, getResponse) {
        try {
            if (phone_number.length === 10 && phone_number.substr(0, 1) == "0" && country_code != "") {
                getResponse(country_code + phone_number.substr(1, 10), "");
            } else if (phone_number.length === 9 && phone_number.substr(0, 1) != "0" && (country_code != "" || country_code == "" || country_code == undefined)) {
                if (country_code == "" || country_code == undefined) {
                    country_code = "254";
                }
                getResponse(country_code + phone_number, "");
            } else if ((country_code == phone_number.substr(0, 3) && phone_number.length === 12) || (phone_number.length === 12 && country_code == "")) {
                if (country_code != phone_number.substr(0, 3) && country_code != "") {
                    getResponse(country_code + phone_number.substr(3, 12), "");
                } else {
                    getResponse(phone_number, "");
                }
            } else {
                getResponse(false, phone_number);
            }

        } catch (e) {
            getResponse(false, phone_number);
        }

    },

};

module.exports = Utilities;
