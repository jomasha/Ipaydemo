/**
 * Author : joseph
 * Year : 2017
 * Email : josephmacharia91@gmail.com
 */
let Utilities = require('./Utilities_old');
let utilities = new Utilities();


function DbHelper(tableName) {
    this.tableName = "";
}

DbHelper.prototype = {
    query: function (query, values, getResponse) {
        utilities.dbo.getConnection(function (err, connection) {
            if (err) {
                getResponse("Connection : " + err);
            } else {
                connection.query(query, values, function (err, result) {
                    connection.release();
                    getResponse(err, result);
                });
            }
        });
    }
};

module.exports = DbHelper;
