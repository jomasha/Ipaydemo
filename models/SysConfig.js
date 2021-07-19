/**
 * Author : Joseph Macharia
 * Year : 2015
 * Email : josephmacharia91@gmail.com
 */
let fs = require('fs');
let sys_config = JSON.parse(fs.readFileSync('config/sys_config.json'));
let mysql = require('mysql');
let { DB_HOST, DB_USERNAME, DB_PASSWORD, DB_DATABASE, DB_PORT } = process.env;
console.log(DB_PASSWORD)
function SysConfig() {

}

SysConfig.prototype = {
    dbConnection: function () {
        return mysql.createPool({
            host: DB_HOST,
            user: DB_USERNAME,
            password: DB_PASSWORD,
            database: DB_DATABASE,
            port: DB_PORT,
            connectionLimit: 100,
            multipleStatements: true,
            dateStrings: [
                'DATE',
                'DATETIME'
            ]
        })
    },

    sysConfig: function () {
        return sys_config;
    }
};

module.exports = new SysConfig();