"use strict";
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_APIKEY);
const pug = require('pug');
const path = require('path');
const views=path.join(__dirname, '../views')

function mailNotify(options, template, context) {
    return new Promise( (resolve, reject) => {
        try {
            var message = {
                to: options.to,
                from: options.from,
                subject: options.subject,
                html: pug.renderFile(path.join(views, template), context)
            };
            sgMail.send(message, (err, result) => {
                if(err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            })
        } catch( err ) {
            reject(err);
        }
    })
}

module.exports = mailNotify;