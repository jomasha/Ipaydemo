let Utilities = require('./Utilities.js');
let utilities = new Utilities();
var moment = require('moment');
function Transactions(id, vid, refference, phone, amount, ipayRef, status, transaction_ref) {
    this.primaryKey = "id";
    this.tableName = "transactions";
    this.GET_DATA = "";
    this.extraWhere = "";
    this.columns = "";
    this.owner = false;
    //
    this.id = id;
    this.vid = vid;
    this.refference = refference;
    this.phone = phone;
    this.ipayRef = ipayRef;
    this.status = status;
    this.transaction_ref = transaction_ref;
    this.amount = amount;

}
Transactions.prototype = {
    /**
     * Create method
     * Adds an Object
     */
    create: function (getResponse) {
        //
        var values = [this.vid, this.refference, this.phone, this.amount, this.status];
        //
        let table = this.tableName, lowerPrice = this.lowerPrice;

        utilities.dbo.getConnection(function (err, connection) {
            if (err) {
                getResponse("Connection : " + err);
            } else {
                let query = connection.query("INSERT INTO `transactions` (`vid`,`refference`,`phone`,`amount`,`status`)" +
                    "VALUES(?,?,?,?,?)", values, function (err, result) {
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
     * Update Method
     * Updates the details of an object
     */
    update: function (getResponse) {
        //
        var values = [this.ipayRef, this.status, this.transaction_ref, this.refference];
        console.log(this.refference);
        utilities.dbo.getConnection(function (err, connection) {
            if (err) {
                getResponse("Connection : " + err);
            } else {
                connection.query("UPDATE `transactions` SET `ipayRef` = ?, status=?, transaction_ref=? WHERE `refference` = ?", values, function (err, result) {
                    if (err) {
                        getResponse("Fetch data : " + err);
                    } else {
                        getResponse("1");
                        connection.release();
                    }
                    console.log(result);
                });
            }
        });

    },
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
    }
};

module.exports = Transactions;