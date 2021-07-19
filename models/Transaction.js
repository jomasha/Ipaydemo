let Utilities = require('../models/Utilities.js');
let utilities = new Utilities();
var moment = require('moment');

function Transaction(id, userCreated, dateCreated, userUpdated, dateUpdated, referenceNo, receiptNo, amount, modeOfPayment, transaction_type, purpose, obj_id, pricingRatesId, pricingRatesAppliedRate, tokens, organizationId, status, publish) {
    this.primaryKey = "id";
    this.tableName = "wallet";
    this.GET_DATA = "";
    this.extraWhere = "";
    this.columns = "";
    this.owner = false;
    //
    this.id = id;
    this.transactionId = id;
    this.userId = userCreated;
    this.dateCreated = dateCreated;
    this.userUpdated = userUpdated;
    this.dateUpdated = dateUpdated;
    this.ref = referenceNo;
    this.receiptNo = receiptNo;
    this.amount = amount;
    this.modeOfPayment = modeOfPayment;
    this.transactionType = transaction_type;
    this.rateId = pricingRatesId;
    this.appliedRate = pricingRatesAppliedRate;
    this.tokens = tokens;
    this.org = organizationId;
    this.status = status;
    this.publish = publish;
    this.purpose = purpose;
    this.obj_id = obj_id;

}


Transaction.prototype = {
    /**
     * Create method
     * Adds an Object
     */
    create: function (getResponse) {
        //
        var values = [this.userId, this.ref, this.receiptNo, this.amount, this.modeOfPayment, this.transactionType, this.purpose, this.rateId, this.appliedRate, this.tokens, this.org, this.status];
        //
        let table = this.tableName, lowerPrice = this.lowerPrice;

        utilities.dbo.getConnection(function (err, connection) {
            if (err) {
                getResponse("Connection : " + err);
            } else {
                let query = connection.query("INSERT INTO `wallet` (`user_created`,`reference_no`,`receipt_no`,`amount`,`mode_of_payment`,`transaction_type`,`purpose`,`pricing_rates_id`,`pricing_rates_applied`,`tokens`,`organization_id`,status)" +
                    "VALUES(?,?,?,?,?,?,?,?,?,?,?,?)", values, function (err, result) {
                        if (err) {
                            getResponse("Fetch data : " + err);
                        } else {
                            getResponse("1", result.insertId);
                            connection.release();
                        }
                    });
                console.log(query.sql);
            }
        });
    },
    /**
     * Read method
     * Gets all data
     */
    read: function (req, getResponse) {
        //
        var orgObj = this, userStr = "";
        if (orgObj.owner) {
            userStr = " AND `wallet`.`user_created`=" + orgObj.userId;
        }
        //
        var tableDefinition = {

            sTableName: this.tableName,
            sCountColumnName: this.primaryKey,
            aSearchColumns: ["date_created", "amount", "reference_no", "receipt_no", "mode_of_payment", "transaction_type"],
            sSelectSql: this.tableName + ".*,`user_accounts`.`full_names` ",
            sWhereAndSql: "`wallet`.`publish` = 1 " + userStr,
            sInnerJoin: " LEFT JOIN `user_accounts` ON `user_accounts`.`id` =" + this.tableName + ".`user_created`",
            aColumns: [
                {
                    'db': 'full_names',
                    'dt': 0
                },
                {
                    'db': '`transaction_type',
                    'dt': 1,
                    'formatter': function (d, row) {
                        return row;
                    }
                },
                {
                    'db': 'mode_of_payment',
                    'dt': 2,
                    'formatter': function (d, row) {
                        return d;
                    }
                },
                {
                    'db': 'amount',
                    'dt': 3
                },
                {
                    'db': 'receipt_no',
                    'dt': 4
                },

                {
                    'db': '`tokens',
                    'dt': 5,
                    'formatter': function (d, row) {
                        return row;
                    }
                },
                {
                    'db': 'date_created',
                    'dt': 6,
                    'formatter': function (d, row) {
                        //return moment(d).format("YYYY-MM-DD HH:mm:ss");
                        return moment(d).fromNow();
                    }
                },
                {
                    'db': '`id`',
                    'dt': 7,
                    'formatter': function (d, row) {
                        return row;
                    }
                },
                {
                    'db': 'user_created',
                    'dt': 8
                },
            ]

        };

        utilities.tableLoader(req.query, tableDefinition, function (result) {
            // console.log(result);
            getResponse(result);
        });


    },
    /**
     * Update Method
     * Updates the details of an object
     */
    update: function (getResponse) {
        //
        var values = [this.obj_id, this.id];
        utilities.dbo.getConnection(function (err, connection) {
            if (err) {
                getResponse("Connection : " + err);
            } else {
                connection.query("UPDATE `wallet` SET `obj_id` = ? WHERE `id` = ?", values, function (err, result) {
                    if (err) {
                        getResponse("Fetch data : " + err);
                    } else {
                        getResponse("1");
                        connection.release();
                    }
                });
            }
        });

    },
    /**
     * Delete method
     * Deletes an object
     */
    delete: function (getResponse) {
        var values = [0, this.transactionId];
        //
        utilities.dbo.getConnection(function (err, connection) {
            if (err) {
                getResponse("Connection : " + err);
            } else {
                connection.query("UPDATE `organizations` SET `publish` = ? WHERE `id` = ?", values, function (err, result) {
                    if (err) {
                        getResponse("Fetch data : " + err);
                    } else {
                        getResponse("1");
                        connection.release();
                    }
                });
            }
        });
    },
    /**
     * Gets an object by id
     */
    getById: function (getResponse) {
        var values = [this.transactionId];
        utilities.dbo.getConnection(function (err, connection) {
            if (err) {
                getResponse("Connection : " + err);
            } else {
                connection.query("SELECT * FROM `pricing_rates` WHERE `id` = ?", values, function (err, result) {
                    if (err) {
                        getResponse("Fetch data : " + err);
                    } else {
                        getResponse(result);
                        connection.release();
                    }
                });
            }
        });
    },
    getPreviousBalance: function (getResponse) {
        var values = [this.userId];
        utilities.dbo.getConnection(function (err, connection) {
            if (err) {
                getResponse("Connection : " + err);
            } else {
                connection.query("SELECT COALESCE(SUM(CASE WHEN transaction_type = 1 THEN tokens * -1 ELSE tokens END),0) AS working_balance,`wallet`.* FROM `wallet` WHERE `user_created` = ? ORDER BY `id` DESC LIMIT 1", values, function (err, result) {
                    if (err) {
                        getResponse("Fetch data : " + err);
                    } else {
                        getResponse(result);
                        connection.release();
                    }
                });
            }
        });
    },
    getPackage: function (getResponse) {
        utilities.checkIfExistsHelperInBetween('pricing_rates', "lower_price", "upper_price", this.amount, function (result) {
            getResponse(result);
        }, true);
    },
    /**
     * Gets all
     */
    getAll: function (req, getResponse) {
        let data = [this.userId];
        utilities.dbo.getConnection(function (err, connection) {
            if (err) {
                getResponse("Connection : " + err);
            } else {
                connection.query("SELECT * FROM `wallet` WHERE `user_created`=? AND `publish` = 1", data, function (err, result) {
                    if (err) {
                        getResponse("Fetch data : " + err);
                    } else {
                        getResponse(result);
                        connection.release();
                    }
                });
            }
        });
    },
};

module.exports = Transaction;

