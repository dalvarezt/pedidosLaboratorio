const Cloudant = require('@cloudant/cloudant');

var cloudant, db;

/**
 * @promise 
 * @reject {Error}
 * @fulfill {Cloudant.db}
 * @returns {Promise.<Cloudant.db>}
*/
module.exports.getConnection = async function () {
    if (!cloudant) {
        cloudant = Cloudant({
            url: process.env.CLOUDANT_URL,
            account: process.env.CLOUDANT_USERNAME,
            password: process.env.CLOUDANT_PASSWORD
        });
        try {
            db = cloudant.use(process.env.CLOUDANT_DB);
        } catch (err) {
            console.error("Database not found", err);
            await cloudant.create(process.env.CLOUDANT_DB);
            db = cloudant.use(process.env.CLOUDANT_DB);
        }
    }
    return db;
}